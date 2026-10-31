import ClientBoot from "./client-boot";
export default function Home() {
  return (
    <>
      <a className="skip" href="#atelier">
        Ir para o ateliê
      </a>
      <header className="topbar">
        <a href="/" className="wordmark" aria-label="Vértice, início">
          VÉRTICE<span aria-hidden="true">◦</span>
        </a>
        <nav aria-label="Navegação principal">
          <a href="#conceito">Conceito</a>
          <a href="#colecao">Estudos</a>
          <a href="#atelier" className="nav-cta">
            Seu ateliê <span>↗</span>
          </a>
        </nav>
      </header>
      <div className="stage" aria-hidden="true">
        <div className="stage-glow" />
        <img
          className="poster"
          src="/media/sculpture-poster.svg"
          alt=""
          width="1000"
          height="1000"
          fetchPriority="high"
        />
        <canvas id="sculpture" />
        <div className="stage-grid" />
      </div>
      <main>
        <section className="hero" id="conceito" aria-labelledby="hero-title">
          <div className="hero-meta">
            <span>ATELIÊ DE ESCULTURAS DIGITAIS</span>
            <span>ESTUDOS DE FORMA — VOL. 01</span>
          </div>
          <div className="hero-title">
            <h1 id="hero-title">
              O impossível
              <br />
              <em>tem forma.</em>
            </h1>
          </div>
          <div className="hero-bottom">
            <p>
              Entre a precisão e o acaso,
              <br />
              existe um gesto que é só seu.
            </p>
            <a className="round-link" href="#atelier">
              <span>Crie sua forma</span>
              <b>↗</b>
            </a>
          </div>
          <div className="scroll-cue">
            <i /> Role para transformar
          </div>
          <span className="hero-caption">ELO / CROMO POLIDO / ESTUDO 001</span>
        </section>
        <section className="journey" aria-labelledby="journey-title">
          <div className="journey-sticky">
            <span className="eyebrow">01 — MATÉRIA EM MOVIMENTO</span>
            <h2 id="journey-title">
              Uma linha.
              <br />
              Nenhum
              <br />
              <em>ponto final.</em>
            </h2>
            <p>
              A forma se dobra.
              <br />A luz encontra outro caminho.
              <br />E o mesmo objeto vira outro.
            </p>
            <div className="journey-note">
              <span>128 × 24</span>
              <small>
                coordenadas que
                <br />
                viram possibilidades.
              </small>
            </div>
          </div>
        </section>
        <section
          className="collection"
          id="colecao"
          aria-labelledby="collection-title"
        >
          <div className="section-label" data-reveal>
            <span>02 — PONTOS DE PARTIDA</span>
            <span>TRÊS GESTOS. NENHUMA REGRA FIXA.</span>
          </div>
          <h2 id="collection-title" data-reveal>
            Escolha onde
            <br />
            <em>começar.</em>
          </h2>
          <div className="study-list">
            {[
              {
                n: "01",
                id: "elo",
                title: "Elo",
                desc: "Uma linha. Infinitas voltas.",
                material: "CROMO",
              },
              {
                n: "02",
                id: "fluxo",
                title: "Fluxo",
                desc: "O gesto que não termina.",
                material: "COBRE",
              },
              {
                n: "03",
                id: "nucleo",
                title: "Núcleo",
                desc: "Tudo volta ao centro.",
                material: "CERÂMICA",
              },
            ].map((s) => (
              <button
                key={s.id}
                data-preset={s.id}
                className="study"
                aria-label={"Criar a partir de " + s.title}
              >
                <span className="study-number">{s.n}</span>
                <span className="study-name">
                  {s.title}
                  <small>{s.desc}</small>
                </span>
                <span className="study-material">{s.material}</span>
                <span className="study-arrow">↗</span>
              </button>
            ))}
          </div>
        </section>
        <section
          className="atelier-section"
          id="atelier"
          aria-label="Ateliê paramétrico"
        >
          <div className="viewer-label">
            <span className="eyebrow">03 — FAÇA DO SEU JEITO</span>
            <p>
              O gesto é seu.
              <br />
              <em>A forma também.</em>
            </p>
            <span id="scene-status">Vista tridimensional / luz de estúdio</span>
          </div>
          <div id="atelier-root">
            <p className="atelier-loading">Preparando seus instrumentos…</p>
          </div>
          <noscript>
            <p>
              O editor precisa de JavaScript para calcular e guardar sua
              escultura. Explore o conceito nesta página ou consulte o contrato
              da API no rodapé.
            </p>
          </noscript>
        </section>
        <section className="manifesto" id="manifesto">
          <div className="manifesto-photo">
            <img
              src="/media/concrete-spiral.webp"
              alt="Escada espiral de concreto vista de cima, em preto e branco"
              width="1400"
              height="934"
              loading="lazy"
              decoding="async"
            />
            <span>FOTOGRAFIA / ADRIEN OLICHON</span>
          </div>
          <div className="manifesto-copy" data-reveal>
            <span className="eyebrow">UM ATELIÊ SEM PAREDES</span>
            <h2>
              Nem tudo
              <br />
              precisa
              <br />
              <em>ser reto.</em>
            </h2>
            <p>
              Uma curva muda a maneira de olhar.
              <br />
              Outra, a maneira de criar.
            </p>
            <p>
              VÉRTICE é um espaço para experimentar. Cada peça nasce de relações
              matemáticas, mas é a sua escolha que dá sentido à forma.
            </p>
            <a href="#atelier">
              Voltar ao seu gesto <span>↗</span>
            </a>
          </div>
        </section>
      </main>
      <footer>
        <a href="/" className="wordmark">
          VÉRTICE<span aria-hidden="true">◦</span>
        </a>
        <p>
          Objetos digitais.
          <br />
          Possibilidades reais.
        </p>
        <div>
          <a href="/api-docs.html">Como funciona ↗</a>
          <a href="https://github.com/gustapaz/vertice-studio">
            Código e créditos ↗
          </a>
          <span>GUSTAVO PAZ · 2026</span>
        </div>
        <div className="footer-bottom">
          <span>SEM COMPRAS. SEM FABRICAÇÃO. SÓ EXPERIMENTAÇÃO.</span>
          <span>ESTÚDIO DE LUZ / POLY HAVEN · FOTOGRAFIA / PEXELS</span>
        </div>
      </footer>
      <div className="chapter-rail" aria-hidden="true">
        <span id="chapter-number">01</span>
        <i />
        <span>03</span>
      </div>
      <button id="motion-toggle" className="motion-toggle" aria-pressed="false">
        Pausar movimento
      </button>
      <ClientBoot />
    </>
  );
}
