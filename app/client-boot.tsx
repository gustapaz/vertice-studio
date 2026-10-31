"use client";
import { useEffect } from "react";
export default function ClientBoot() {
  useEffect(() => {
    const script = document.createElement("script");
    script.type = "module";
    script.src = "/atelier/app.js";
    document.body.appendChild(script);
    return () => {
      script.remove();
    };
  }, []);
  return null;
}
