import { Component, h, define } from "omi";
import { api, ApiError } from "./api";
import type { Params, Piece, Geometry, Preset, Credential } from "./types";
import css from "./editor.css?inline";
type Catalog = { presets: Preset[] };
const key = "vertice-tab-pieces";
const credentials = (): Credential[] => {
  try {
    const a = JSON.parse(sessionStorage.getItem(key) ?? "[]");
    return Array.isArray(a)
      ? a
          .filter(
            (x) =>
              typeof x.id === "string" &&
              typeof x.token === "string" &&
              typeof x.title === "string",
          )
          .slice(0, 12)
      : [];
  } catch {
    return [];
  }
};
export class Atelier extends Component {
  static css = css;
  params: Params = { folds: 3, torsion: 2, tension: 68, finish: "chrome" };
  title = "Elo · estudo 01";
  presets: Preset[] = [];
  geometry?: Geometry;
  confirmed = "";
  piece?: Piece;
  token = "";
  saved = credentials();
  status = "Abrindo o ateliê…";
  error = "";
  busy = true;
  loading = true;
  wire = false;
  sequence = 0;
  controller?: AbortController;
  share = "";
  retryAction: () => Promise<void> = () => this.start();
  installed() {
    void this.start();
  }
  notify() {
    this.update();
  }
  async start() {
    this.retryAction = () => this.start();
    this.loading = true;
    this.busy = true;
    this.error = "";
    this.notify();
    try {
      const catalog = await api<Catalog>("/api/catalog");
      this.presets = catalog.presets;
      const id = new URL(location.href).searchParams.get("piece");
      if (id) {
        await this.open(id);
        return;
      }
      this.params = { ...catalog.presets[0].params };
      await this.preview();
    } catch (e) {
      this.failure(e);
    } finally {
      this.loading = false;
      this.busy = false;
      this.notify();
    }
  }
  failure(e: unknown) {
    if (e instanceof DOMException && e.name === "AbortError") return;
    this.error = e instanceof Error ? e.message : "Não foi possível concluir.";
    this.status =
      e instanceof ApiError && e.code === "revision_conflict"
        ? "Conflito: releia a peça salva antes de continuar."
        : "O ateliê precisa da sua atenção.";
  }
  async preview() {
    this.retryAction = () => this.preview();
    const seq = ++this.sequence;
    this.controller?.abort();
    this.controller = new AbortController();
    this.busy = true;
    this.error = "";
    this.status = "Esculpindo a forma…";
    this.notify();
    try {
      const geometry = await api<Geometry>("/api/mesh", {
        method: "POST",
        body: { params: this.params },
        signal: this.controller.signal,
      });
      if (seq !== this.sequence) return;
      this.geometry = geometry;
      this.confirmed = JSON.stringify(geometry.params);
      window.dispatchEvent(
        new CustomEvent("vertice:geometry", { detail: geometry }),
      );
      this.status = "Forma pronta. Explore cada ângulo.";
    } catch (e) {
      if (seq === this.sequence) this.failure(e);
    } finally {
      if (seq === this.sequence) {
        this.busy = false;
        this.notify();
      }
    }
  }
  change(field: "folds" | "torsion" | "tension", value: string) {
    this.params = { ...this.params, [field]: Number(value) };
    this.status = "Forma alterada. Solte o controle para recalcular.";
    this.error = "";
    this.notify();
  }
  select(preset: Preset) {
    this.params = { ...preset.params };
    this.title = preset.title + " · estudo";
    void this.preview();
  }
  async open(id: string) {
    this.retryAction = () => this.open(id);
    this.busy = true;
    this.error = "";
    this.notify();
    try {
      const own = this.saved.find((x) => x.id === id);
      const data = await api<{ piece: Piece }>(
        "/api/pieces/" + encodeURIComponent(id),
        { token: own?.token },
      );
      this.piece = data.piece;
      this.token = own?.token ?? "";
      this.params = { ...data.piece.params };
      this.title = data.piece.title;
      this.share = data.piece.published
        ? location.origin + "/?piece=" + data.piece.id
        : "";
      await this.preview();
      this.status = this.token
        ? "Peça reaberta do ateliê."
        : "Você está vendo uma peça compartilhada. Pode criar sua própria cópia.";
    } catch (e) {
      this.failure(e);
    } finally {
      this.busy = false;
      this.notify();
    }
  }
  remember(id: string, token: string) {
    this.saved = [
      { id, token, title: this.title },
      ...this.saved.filter((x) => x.id !== id),
    ].slice(0, 12);
    try {
      sessionStorage.setItem(key, JSON.stringify(this.saved));
    } catch {
      this.error =
        "A peça foi salva, mas este navegador não permitiu guardar o acesso nesta aba.";
    }
  }
  async save() {
    this.retryAction = () => this.save();
    if (this.busy || this.confirmed !== JSON.stringify(this.params)) return;
    this.busy = true;
    this.error = "";
    this.status = "Guardando sua peça…";
    this.notify();
    try {
      const own = !!this.piece && !!this.token;
      const value = await api<{ piece: Piece; token?: string }>(
        own ? "/api/pieces/" + this.piece!.id : "/api/pieces",
        {
          method: own ? "PUT" : "POST",
          token: own ? this.token : undefined,
          body: {
            title: this.title,
            params: this.params,
            ...(own ? { expected_revision: this.piece!.revision } : {}),
          },
        },
      );
      this.piece = value.piece;
      if (value.token) this.token = value.token;
      this.remember(value.piece.id, this.token);
      this.status = "Peça salva no ateliê · revisão " + value.piece.revision;
      this.share = value.piece.published
        ? location.origin + "/?piece=" + value.piece.id
        : "";
    } catch (e) {
      this.failure(e);
    } finally {
      this.busy = false;
      this.notify();
    }
  }
  async visibility() {
    this.retryAction = () => this.visibility();
    if (!this.piece || !this.token || this.busy) return;
    this.busy = true;
    this.error = "";
    this.notify();
    try {
      const { piece } = await api<{ piece: Piece }>(
        "/api/pieces/" + this.piece.id + "/publish",
        {
          method: "POST",
          token: this.token,
          body: {
            expected_revision: this.piece.revision,
            published: !this.piece.published,
          },
        },
      );
      this.piece = piece;
      this.share = piece.published
        ? location.origin + "/?piece=" + piece.id
        : "";
      this.status = piece.published
        ? "Link de leitura criado. Quem receber poderá ver e exportar esta peça."
        : "Compartilhamento encerrado. A peça voltou a ser privada.";
    } catch (e) {
      this.failure(e);
    } finally {
      this.busy = false;
      this.notify();
    }
  }
  async copy() {
    try {
      await navigator.clipboard.writeText(this.share);
      this.status = "Link copiado.";
    } catch {
      this.status = "Copie o link exibido abaixo.";
    }
    this.notify();
  }
  async exportObj() {
    this.retryAction = () => this.exportObj();
    if (!this.piece || this.busy) return;
    this.busy = true;
    this.error = "";
    this.notify();
    try {
      const r = await fetch("/api/pieces/" + this.piece.id + "/mesh.obj", {
        headers: this.token ? { authorization: "Bearer " + this.token } : {},
      });
      if (!r.ok) throw new Error("Não foi possível exportar a peça salva.");
      const blob = await r.blob(),
        url = URL.createObjectURL(blob),
        a = document.createElement("a");
      a.href = url;
      a.download = "vertice-" + this.piece.id + ".obj";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      this.status = "Geometria da última revisão salva exportada em OBJ.";
    } catch (e) {
      this.failure(e);
    } finally {
      this.busy = false;
      this.notify();
    }
  }
  newPiece() {
    this.piece = undefined;
    this.token = "";
    this.share = "";
    history.replaceState(null, "", location.pathname + "#atelier");
    this.status = "Novo estudo. A peça anterior continua no arquivo desta aba.";
    this.notify();
  }
  toggleWire() {
    this.wire = !this.wire;
    window.dispatchEvent(
      new CustomEvent("vertice:wire", { detail: this.wire }),
    );
    this.notify();
  }
  render() {
    const valid =
        this.title.trim().length > 0 && this.title.trim().length <= 48,
      ready = this.confirmed === JSON.stringify(this.params),
      owns = !!this.token;
    return (
      <div class="panel">
        <div class="panel-top">
          <span class="eyebrow">ATELIÊ / 01</span>
          <span class="live">
            <i />{" "}
            {this.piece
              ? "PEÇA " + this.piece.id.slice(0, 6).toUpperCase()
              : "ESTUDO LIVRE"}
          </span>
        </div>
        <h2>
          Sua forma.
          <br />
          <em>Suas regras.</em>
        </h2>
        <p class="intro">Parta de um gesto. Dê a ele outro destino.</p>
        <div class="presets" role="group" aria-label="Formas de partida">
          {this.presets.map((p) => (
            <button disabled={this.busy} onClick={() => this.select(p)}>
              {p.title}
              <span>↗</span>
            </button>
          ))}
        </div>
        <div class="sliders">
          {(
            [
              { field: "folds", label: "Dobras", min: 3, max: 9 },
              { field: "torsion", label: "Torção", min: 0, max: 4 },
              { field: "tension", label: "Tensão", min: 0, max: 100 },
            ] as const
          ).map((c) => (
            <label>
              <span>
                {c.label}
                <output>
                  {String(this.params[c.field]).padStart(2, "0")}
                  {c.field === "tension" ? "%" : ""}
                </output>
              </span>
              <input
                aria-label={c.label}
                type="range"
                min={c.min}
                max={c.max}
                step="1"
                value={this.params[c.field]}
                disabled={this.loading}
                onInput={(e: Event) =>
                  this.change(c.field, (e.target as HTMLInputElement).value)
                }
                onChange={() => void this.preview()}
              />
            </label>
          ))}
        </div>
        <fieldset>
          <legend>Acabamento</legend>
          <div class="finishes">
            {(["chrome", "copper", "ceramic"] as const).map((f, i) => (
              <button
                aria-label={["Cromo", "Cobre", "Cerâmica"][i]}
                aria-pressed={this.params.finish === f}
                class={f}
                disabled={this.busy}
                onClick={() => {
                  this.params = { ...this.params, finish: f };
                  void this.preview();
                }}
              >
                <i />
                {["Cromo", "Cobre", "Cerâmica"][i]}
              </button>
            ))}
          </div>
        </fieldset>
        <div class="view-actions">
          <button aria-pressed={this.wire} onClick={() => this.toggleWire()}>
            ◈ {this.wire ? "Ocultar estrutura" : "Ver estrutura"}
          </button>
          <button
            onClick={() =>
              window.dispatchEvent(new CustomEvent("vertice:angle"))
            }
          >
            Girar vista ↻
          </button>
        </div>
        <label class="title-label">
          Nome da peça
          <input
            aria-label="Nome da peça"
            type="text"
            maxlength="48"
            value={this.title}
            onInput={(e: Event) => {
              this.title = (e.target as HTMLInputElement).value;
              this.notify();
            }}
            placeholder="Dê um nome ao seu gesto"
          />
        </label>
        <div class="save-row">
          <button
            class="primary"
            disabled={this.busy || !ready || !valid}
            onClick={() => void this.save()}
          >
            {this.busy
              ? "Um instante…"
              : this.piece && owns
                ? "Salvar alterações ↗"
                : this.piece
                  ? "Guardar minha cópia ↗"
                  : "Guardar esta forma ↗"}
          </button>
          {this.piece && (
            <button
              class="subtle"
              disabled={this.busy}
              onClick={() => this.newPiece()}
            >
              Novo estudo
            </button>
          )}
        </div>
        <p
          class={"status " + (this.error ? "has-error" : "")}
          role="status"
          aria-live="polite"
        >
          {this.error || this.status}
        </p>
        {this.error && (
          <div class="retry">
            <button
              onClick={() => void this.retryAction()}
              disabled={this.busy}
            >
              Tentar novamente
            </button>
            {this.piece && (
              <button onClick={() => void this.open(this.piece!.id)}>
                Reler peça salva
              </button>
            )}
          </div>
        )}
        {this.piece && (
          <div class="saved">
            <span class="eyebrow">
              {this.piece.published ? "LINK ATIVO / LEITURA" : "PEÇA PRIVADA"} ·
              REV {this.piece.revision}
            </span>
            <div class="saved-actions">
              {owns && (
                <button
                  disabled={
                    this.busy ||
                    !ready ||
                    this.title !== this.piece.title ||
                    JSON.stringify(this.params) !==
                      JSON.stringify(this.piece.params)
                  }
                  onClick={() => void this.visibility()}
                >
                  {this.piece.published
                    ? "Encerrar link"
                    : "Criar link de leitura"}{" "}
                  ↗
                </button>
              )}
              <button
                disabled={this.busy}
                onClick={() => void this.exportObj()}
              >
                Exportar OBJ ↓
              </button>
              <button
                disabled={this.busy}
                onClick={() => void this.open(this.piece!.id)}
              >
                Reler
              </button>
            </div>
            {this.share && (
              <div class="share">
                <a href={this.share} target="_blank" rel="noreferrer">
                  Abrir peça compartilhada ↗
                </a>
                <button onClick={() => void this.copy()}>Copiar link</button>
              </div>
            )}
            {this.piece.published && owns && (
              <p class="fine">
                Salvar mudanças nesta peça também atualiza o link compartilhado.
              </p>
            )}
          </div>
        )}
        {this.geometry && (
          <dl class="metrics">
            <div>
              <dt>Vértices</dt>
              <dd>{this.geometry.stats.vertices.toLocaleString("pt-BR")}</dd>
            </div>
            <div>
              <dt>Superfície</dt>
              <dd>{this.geometry.stats.area.toFixed(2)} u²</dd>
            </div>
            <div>
              <dt>Volume</dt>
              <dd>{this.geometry.stats.volume.toFixed(2)} u³</dd>
            </div>
          </dl>
        )}
        <details>
          <summary>
            Meu arquivo nesta aba{" "}
            <span>{this.saved.length.toString().padStart(2, "0")}</span>
          </summary>
          {this.saved.length ? (
            <ul>
              {this.saved.map((s) => (
                <li>
                  <button
                    disabled={this.busy}
                    onClick={() => void this.open(s.id)}
                  >
                    {s.title}
                    <span>↗</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p>Suas peças salvas aparecerão aqui.</p>
          )}
        </details>
        <p class="fine">
          Estudos digitais, sem fabricação. Peças guardadas por 7 dias. O acesso
          de edição fica apenas nesta aba; compartilhe somente o link de
          leitura. Exportação da geometria, sem acabamento.
        </p>
      </div>
    );
  }
}
define("vertice-atelier", Atelier);
