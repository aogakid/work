import * as React from "react"
import { forwardRef, useImperativeHandle, useRef, useState, useMemo } from "react"
import type { CompanionActions } from "../companions/registry"


const injectStyles = `
  :root {
    --gest-bg: #ffffff;
    --gest-text: #1a1916;
    --gest-text-muted: #6b6760;
    --gest-input-bg: rgba(120,120,120,0.08);
    --gest-border: rgba(120,120,120,0.15);
    --gest-card-bg: rgba(120,120,120,0.06);
    --gest-copy-bg: rgba(255,255,255,0.5);
    --gest-copy-hover: rgba(120,120,120,0.1);
    --gest-progress-track: rgba(120,120,120,0.12);
    --gest-progress-fill: rgba(26, 25, 22, 0.25);
    --gest-progress-marker: rgba(26, 25, 22, 0.35);
    --gest-milestone-now-bg: rgba(224, 36, 36, 0.1);
    --gest-milestone-now-border: rgba(224, 36, 36, 0.35);
    --gest-milestone-soon-bg: rgba(242, 143, 0, 0.08);
    --gest-milestone-soon-border: rgba(242, 143, 0, 0.3);
  }

  @media (prefers-color-scheme: dark) {
    :root {
      --gest-bg: #1c1917;
      --gest-text: #f5f5f4;
      --gest-text-muted: #78716c;
      --gest-input-bg: #2e2b29;
      --gest-border: rgba(255,255,255,0.15);
      --gest-card-bg: rgba(255,255,255,0.06);
      --gest-copy-bg: rgba(28, 25, 23, 0.5);
      --gest-copy-hover: rgba(255,255,255,0.1);
      --gest-progress-track: rgba(255,255,255,0.12);
      --gest-progress-fill: rgba(245, 245, 244, 0.25);
      --gest-progress-marker: rgba(245, 245, 244, 0.35);
      --gest-milestone-now-bg: rgba(239, 68, 68, 0.15);
      --gest-milestone-now-border: rgba(239, 68, 68, 0.4);
      --gest-milestone-soon-bg: rgba(251, 146, 60, 0.12);
      --gest-milestone-soon-border: rgba(251, 146, 60, 0.35);
    }

    /* Dark mode date input styling */
    input[type="date"] {
      color-scheme: dark;
    }
    
    input[type="date"]::-webkit-calendar-picker-indicator {
      filter: invert(1);
      opacity: 0.7;
      cursor: pointer;
    }
    
    input[type="date"]::-webkit-calendar-picker-indicator:hover {
      opacity: 1;
    }
  }

  /* Light mode date input styling */
  input[type="date"]::-webkit-calendar-picker-indicator {
    filter: none;
    opacity: 0.6;
    cursor: pointer;
  }
  
  input[type="date"]::-webkit-calendar-picker-indicator:hover {
    opacity: 1;
  }

  .gest-main {
    display: grid;
    grid-template-columns: 1fr;
    gap: 16px;
    align-items: start;
  }

  @media (min-width: 900px) {
    .gest-main {
      grid-template-columns: 1.15fr 1fr;
    }
  }

  .gest-side {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .gest-card {
    border-radius: 12px;
    padding: 20px;
    box-sizing: border-box;
    background: var(--gest-card-bg);
    border: 1px solid var(--gest-border);
  }

  .gest-card-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 4px;
  }

  .gest-copy-btn {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 34px;
    border-radius: 8px;
    border: 1px solid var(--gest-border);
    background: var(--gest-copy-bg);
    color: var(--gest-text-muted);
    cursor: pointer;
    transition: all 0.15s ease;
    padding: 0;
  }

  .gest-copy-btn:hover {
    background: var(--gest-copy-hover);
    color: var(--gest-text);
  }

  .gest-copy-btn--ok {
    color: #007a30;
    border-color: rgba(0, 184, 73, 0.35);
    background: rgba(0, 184, 73, 0.08);
  }

  .gest-progress-wrap {
    margin-top: 18px;
  }

  .gest-progress-track {
    position: relative;
    height: 10px;
    border-radius: 999px;
    overflow: visible;
    display: flex;
    background: var(--gest-progress-track);
  }

  .gest-progress-seg {
    height: 100%;
  }

  .gest-progress-seg--t1 { background: rgba(0, 184, 73, 0.45); border-radius: 999px 0 0 999px; }
  .gest-progress-seg--t2 { background: rgba(59, 130, 246, 0.45); }
  .gest-progress-seg--t3 { background: rgba(147, 51, 234, 0.45); border-radius: 0 999px 999px 0; }

  .gest-progress-fill {
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    border-radius: 999px;
    background: rgba(26, 25, 22, 0.5);
    pointer-events: none;
    transition: left 0.4s ease, width 0.4s ease;
  }

  .gest-progress-marker {
    position: absolute;
    top: 50%;
    transform: translate(-50%, -50%);
    width: 3px;
    height: 16px;
    border-radius: 2px;
    background: var(--gest-progress-marker);
    z-index: 2;
  }

  .gest-progress-marker--dum,
  .gest-progress-marker--dpp {
    width: 4px;
    height: 18px;
    background: var(--gest-text);
  }

  .gest-progress-thumb {
    position: absolute;
    top: 50%;
    transform: translate(-50%, -50%);
    font-size: 16px;
    line-height: 1;
    z-index: 3;
    transition: left 0.4s ease;
  }

  .gest-progress-labels {
    position: relative;
    margin-top: 10px;
    height: 24px;
  }

  .gest-progress-labels span {
    position: absolute;
    top: 0;
    font-size: 10px;
    color: var(--gest-text-muted);
    font-weight: 600;
    transform: translateX(-50%);
    text-align: center;
  }

  .gest-progress-labels span:first-child { left: 0%; }
  .gest-progress-labels span:nth-child(2) { left: 17.5%; }
  .gest-progress-labels span:nth-child(3) { left: 52.5%; }
  .gest-progress-labels span:nth-child(4) { left: 85%; }
  .gest-progress-labels span:last-child { left: 100%; }

  .gest-milestones {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .gest-milestone {
    border-radius: 10px;
    padding: 12px 14px;
  }

  .gest-milestone--now {
    background: var(--gest-milestone-now-bg);
    border: 1px solid var(--gest-milestone-now-border);
  }

  .gest-milestone--soon {
    background: var(--gest-milestone-soon-bg);
    border: 1px solid var(--gest-milestone-soon-border);
  }

  .gest-milestone-tag {
    display: block;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 6px;
    color: var(--gest-text-muted);
  }

  .gest-milestone-title {
    display: block;
    font-size: 14px;
    font-weight: 700;
    color: var(--gest-text);
    margin-bottom: 4px;
    line-height: 1.3;
  }

  .gest-milestone-desc {
    display: block;
    font-size: 13px;
    color: var(--gest-text-muted);
    line-height: 1.5;
    margin: 0;
  }

  .gest-inputs-row {
    display: flex;
    flex-direction: column;
    gap: 8px;
    width: 100%;
    min-width: 0;
  }

  .gest-inputs-line {
    display: flex;
    gap: 10px;
    align-items: flex-end;
    min-width: 0;
    flex-wrap: wrap;
  }

  .gest-inputs-line .gest-field {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
  }

  /* DUM and US date split the row on big screens */
  .gest-inputs-line .gest-field--dum {
    flex: 1 1 180px;
  }

  .gest-inputs-line .gest-field--date {
    flex: 1 1 190px;
  }

  .gest-inputs-line .gest-field--narrow {
    flex: 0 1 64px;
  }

  .gest-inputs-line input {
    width: 100%;
    box-sizing: border-box;
    min-width: 0;
  }

  .gest-inputs-row .gest-field-label {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--gest-text-muted);
    font-weight: 600;
    white-space: nowrap;
  }

  .gest-ou {
    font-size: 12px;
    color: var(--gest-text-muted);
    font-weight: 600;
    padding-bottom: 10px;
    flex-shrink: 0;
  }

  .gest-dating-card {
    margin-top: 16px;
    border-radius: 10px;
    padding: 14px 16px;
    background: var(--gest-card-bg);
    border: 1px solid var(--gest-border);
    font-size: 13px;
    line-height: 1.5;
  }

  /* Rotina pré-natal (MS) */
  .gest-routine {
    margin-top: 16px;
  }

  .gest-routine-item {
    background: var(--gest-card-bg);
    border: 1px solid var(--gest-border);
    border-radius: 10px;
    padding: 10px 12px;
    min-width: 0;
  }

  .gest-routine-item + .gest-routine-item {
    margin-top: 8px;
  }

  /* grupos já totalmente passados */
  .gest-routine-item--done {
    opacity: 0.55;
  }

  .gest-routine-item--past .gest-routine-item-title,
  .gest-routine-item--past .gest-routine-li {
    opacity: 0.6;
  }

  /* cores por trimestre — mesmas da barra de progresso.
     Aplicadas só quando o trimestre é o atual (--cur) ou
     contém a próxima consulta (--next). */
  .gest-routine-item--t1.gest-routine-item--cur,
  .gest-routine-item--t1.gest-routine-item--next {
    background: rgba(0, 184, 73, 0.16);
    border-color: rgba(0, 184, 73, 0.5);
  }

  .gest-routine-item--t2.gest-routine-item--cur,
  .gest-routine-item--t2.gest-routine-item--next {
    background: rgba(59, 130, 246, 0.16);
    border-color: rgba(59, 130, 246, 0.5);
  }

  .gest-routine-item--t3.gest-routine-item--cur,
  .gest-routine-item--t3.gest-routine-item--next {
    background: rgba(147, 51, 234, 0.16);
    border-color: rgba(147, 51, 234, 0.5);
  }

  .gest-routine-item-title {
    display: block;
    font-size: 13px;
    font-weight: 700;
    color: var(--gest-text);
    margin-bottom: 2px;
  }

  .gest-routine-item-desc {
    display: block;
    font-size: 12px;
    color: var(--gest-text-muted);
    line-height: 1.5;
  }

  .gest-routine-list {
    margin-top: 2px;
  }

  .gest-routine-li {
    position: relative;
    padding: 2px 0 2px 13px;
    font-size: 12.5px;
    color: var(--gest-text);
    line-height: 1.45;
  }

  .gest-routine-li::before {
    content: "";
    position: absolute;
    left: 0;
    top: 9.5px;
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: var(--gest-progress-marker);
  }

  .gest-routine-source {
    margin-top: 12px;
    padding-top: 10px;
    border-top: 1px dashed var(--gest-border);
    font-size: 10.5px;
    color: var(--gest-text-muted);
    line-height: 1.45;
  }

  .gest-routine-callout {
    background: var(--gest-milestone-now-bg);
    border: 1px solid var(--gest-milestone-now-border);
    border-radius: 8px;
    padding: 8px 10px;
    margin-bottom: 8px;
  }

  .gest-routine-callout-label {
    display: block;
    font-size: 9.5px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--gest-text-muted);
    margin-bottom: 2px;
  }

  .gest-routine-callout-value {
    display: block;
    font-size: 13px;
    font-weight: 700;
    color: var(--gest-text);
  }

  .gest-routine-weeks {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-top: 6px;
  }

  .gest-routine-week {
    display: inline-block;
    font-size: 10.5px;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: 999px;
    border: 1px solid var(--gest-border);
    background: var(--gest-input-bg);
    color: var(--gest-text-muted);
    white-space: nowrap;
  }

  .gest-routine-week--done {
    opacity: 0.5;
    text-decoration: line-through;
  }

  /* o trimestre da próxima consulta colore o chip (--tN vem depois e vence) */
  .gest-routine-week--next {
    opacity: 1;
    color: var(--gest-text);
  }

  .gest-routine-chip {
    display: inline-block;
    font-size: 9px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    padding: 1px 6px;
    border-radius: 4px;
    margin-left: 6px;
    vertical-align: middle;
  }

  .gest-routine-chip--done {
    background: rgba(120, 120, 120, 0.15);
    color: var(--gest-text-muted);
  }

  .gest-routine-chip--t1 {
    background: rgba(0, 184, 73, 0.14);
    color: #007a30;
  }

  .gest-routine-chip--t2 {
    background: rgba(59, 130, 246, 0.14);
    color: #2563eb;
  }

  .gest-routine-chip--t3 {
    background: rgba(147, 51, 234, 0.14);
    color: #9333ea;
  }

  .gest-routine-janela {
    color: var(--gest-text-muted);
    font-size: 11.5px;
  }

  .gest-routine-flag {
    font-size: 10.5px;
    font-weight: 700;
    margin-left: 6px;
    white-space: nowrap;
  }

  .gest-routine-flag--ok {
    color: #007a30;
  }

  .gest-routine-flag--late {
    color: #b45309;
  }

  .gest-dating-card-title {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--gest-text-muted);
    margin-bottom: 8px;
  }

  .gest-dating-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    padding: 4px 0;
  }

  .gest-dating-label {
    color: var(--gest-text-muted);
    font-weight: 600;
    font-size: 12px;
  }

  .gest-dating-value {
    font-weight: 700;
    font-size: 13px;
    color: var(--gest-text);
  }

  .gest-dating-rule {
    margin-top: 8px;
    padding-top: 8px;
    border-top: 1px solid var(--gest-border);
    font-size: 12px;
    color: var(--gest-text-muted);
    line-height: 1.5;
  }

  .gest-dating-rule strong {
    color: var(--gest-text);
  }

  .gest-dating-source {
    display: inline-block;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    padding: 2px 8px;
    border-radius: 4px;
    margin-left: 6px;
  }

  .gest-dating-source--dum {
    background: rgba(0, 184, 73, 0.1);
    color: #007a30;
    border: 1px solid rgba(0, 184, 73, 0.3);
  }

  .gest-dating-source--us {
    background: rgba(59, 130, 246, 0.1);
    color: #2563eb;
    border: 1px solid rgba(59, 130, 246, 0.3);
  }

  /* Tabs */
  .gest-tabs {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 18px;
  }

  .gest-tab {
    padding: 8px 18px;
    border-radius: 999px;
    font-size: 13px;
    cursor: pointer;
    user-select: none;
    background: var(--gest-input-bg);
    border: 1px solid var(--gest-border);
    color: var(--gest-text-muted);
    font-weight: 400;
    transition: all 0.15s ease;
  }

  .gest-tab--ativo {
    font-weight: 700;
    color: var(--gest-text);
    background: var(--gest-card-bg);
    border-color: var(--gest-progress-marker);
  }

  /* Checklist de risco gestacional */
  .gest-risk {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .gest-risk-corpo {
    display: grid;
    grid-template-columns: 1fr;
    gap: 16px;
    align-items: start;
  }

  @media (min-width: 760px) {
    .gest-risk-corpo {
      grid-template-columns: 1.4fr 1fr;
    }
  }

  .gest-risk-grupos {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .gest-risk-grupo {
    border: 1px solid var(--gest-border);
    border-radius: 12px;
    padding: 14px;
    background: var(--gest-card-bg);
  }

  .gest-risk-grupo-titulo {
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--gest-text-muted);
    margin-bottom: 8px;
  }

  .gest-risk-list {
    display: flex;
    flex-direction: column;
  }

  .gest-risk-item {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 5px 0;
    cursor: pointer;
  }

  .gest-risk-check {
    appearance: none;
    -webkit-appearance: none;
    width: 17px;
    height: 17px;
    min-width: 17px;
    border-radius: 5px;
    border: 1.5px solid var(--gest-progress-marker);
    background: var(--gest-input-bg);
    cursor: pointer;
    margin-top: 1px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s ease;
  }

  .gest-risk-check:checked {
    background: rgba(0, 184, 73, 0.16);
    border-color: rgba(0, 184, 73, 0.55);
  }

  .gest-risk-check:checked::after {
    content: "";
    width: 9px;
    height: 5px;
    border-left: 2px solid #007a30;
    border-bottom: 2px solid #007a30;
    transform: rotate(-45deg) translateY(-1px);
  }

  .gest-risk-sublabel {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: #2563eb;
    padding: 8px 0 3px 0;
    border-bottom: 1px solid rgba(59, 130, 246, 0.2);
    margin-bottom: 2px;
  }

  .gest-risk-sublabel:first-child {
    padding-top: 2px;
  }

  .gest-risk-sublabel--alto {
    color: #e02424;
    border-bottom-color: rgba(224, 36, 36, 0.2);
    margin-top: 8px;
  }

  .gest-risk-label {
    flex: 1;
    min-width: 0;
    font-size: 13px;
    line-height: 1.45;
    color: var(--gest-text);
  }

  .gest-risk-side {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .gest-risk-resultado {
    border-radius: 12px;
    padding: 18px;
    border: 1px solid var(--gest-border);
  }

  .gest-risk-resultado--baixo {
    background: rgba(0, 184, 73, 0.08);
    border-color: rgba(0, 184, 73, 0.35);
  }

  .gest-risk-resultado--medio {
    background: rgba(242, 143, 0, 0.08);
    border-color: rgba(242, 143, 0, 0.35);
  }

  .gest-risk-resultado--alto {
    background: rgba(224, 36, 36, 0.08);
    border-color: rgba(224, 36, 36, 0.35);
  }

  .gest-risk-score {
    font-size: 26px;
    font-weight: 800;
    margin: 6px 0 10px 0;
    line-height: 1.15;
  }

  .gest-risk-score--baixo { color: #007a30; }
  .gest-risk-score--medio { color: #b45309; }
  .gest-risk-score--alto { color: #e02424; }

  .gest-risk-conduta {
    font-size: 13px;
    line-height: 1.5;
    color: var(--gest-text);
  }

  .gest-risk-fatores {
    margin-top: 12px;
    padding-top: 10px;
    border-top: 1px dashed var(--gest-border);
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .gest-risk-fator {
    font-size: 12px;
    line-height: 1.4;
    color: var(--gest-text);
  }

  .gest-risk-callout {
    margin-top: 12px;
    background: var(--gest-milestone-now-bg);
    border: 1px solid var(--gest-milestone-now-border);
    border-radius: 8px;
    padding: 10px 12px;
    font-size: 12.5px;
    line-height: 1.45;
    color: var(--gest-text);
  }

  .gest-risk-callout strong {
    color: #e02424;
  }

`

const styles = {
    container: {
        background: "var(--gest-bg)",
        color: "var(--gest-text)",
        fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        padding: "24px",
        borderRadius: "16px",
        width: "100%",
        boxSizing: "border-box" as const,
    },
    title: {
        fontSize: "20px",
        fontWeight: 700,
        marginBottom: "4px",
        color: "var(--gest-text)",
    },
    subtitle: {
        fontSize: "13px",
        color: "var(--gest-text-muted)",
        marginBottom: "20px",
    },
    inputGroup: {
        display: "flex",
        flexDirection: "column" as const,
        gap: "6px",
    },
    label: {
        fontSize: "11px",
        textTransform: "uppercase" as const,
        letterSpacing: "0.05em",
        color: "var(--gest-text-muted)",
        fontWeight: 600,
    },
    input: {
        background: "var(--gest-input-bg)",
        border: "1px solid var(--gest-border)",
        borderRadius: "10px",
        padding: "10px 14px",
        color: "var(--gest-text)",
        fontSize: "14px",
        outline: "none",
        height: "42px",
        boxSizing: "border-box" as const,
        width: "100%",
        minWidth: 0,
        appearance: "none" as const,
        transition: "all 0.2s ease",
    },
    badge: {
        display: "inline-block",
        fontSize: "11px",
        fontWeight: 700,
        textTransform: "uppercase" as const,
        padding: "4px 10px",
        borderRadius: "6px",
        letterSpacing: "0.04em",
        marginBottom: "12px",
        background: "rgba(255,255,255,0.6)",
        color: "#e02424",
        border: "1px solid rgba(224, 36, 36, 0.35)",
    },
    scoreValue: {
        fontSize: "28px",
        fontWeight: 800,
        color: "var(--gest-text)",
        margin: "4px 0 16px 0",
        lineHeight: 1.2,
    },
    cardTitle: {
        fontSize: "11px",
        textTransform: "uppercase" as const,
        fontWeight: 700,
        color: "var(--gest-text-muted)",
        marginBottom: "12px",
        letterSpacing: "0.05em",
    },
    funText: {
        fontSize: "14px",
        color: "var(--gest-text)",
        lineHeight: 1.45,
    },
    detailRow: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        gap: "12px",
        padding: "8px 0",
        borderBottom: "1px solid rgba(120,120,120,0.12)",
        fontSize: "13.5px",
    },
    detailLabel: {
        color: "var(--gest-text-muted)",
        fontWeight: 600,
        fontSize: "12px",
        textTransform: "uppercase" as const,
        letterSpacing: "0.04em",
    },
    detailValue: {
        fontWeight: 700,
        textAlign: "right" as const,
    },
    empty: {
        color: "var(--gest-text-muted)",
        fontSize: "14px",
        textAlign: "center" as const,
        padding: "40px 20px",
        border: "1px dashed var(--gest-border)",
        borderRadius: "12px",
    },
    emojiLarge: {
        fontSize: "36px",
        lineHeight: 1,
        marginBottom: "10px",
    },
    alertBox: {
        marginTop: "12px",
        fontSize: "12.5px",
        color: "#b56100",
        lineHeight: 1.4,
        padding: "10px 12px",
        borderRadius: "8px",
        background: "rgba(242, 143, 0, 0.08)",
        border: "1px solid rgba(242, 143, 0, 0.25)",
    },
}

const TRIMESTRE_CORES: Record<
    string,
    { bg: string; border: string; t: string }
> = {
    "1º Trimestre": {
        bg: "rgba(0, 184, 73, 0.09)",
        t: "#007a30",
        border: "rgba(0, 184, 73, 0.35)",
    },
    "2º Trimestre": {
        bg: "rgba(59, 130, 246, 0.09)",
        t: "#2563eb",
        border: "rgba(59, 130, 246, 0.35)",
    },
    "3º Trimestre": {
        bg: "rgba(147, 51, 234, 0.1)",
        t: "#9333ea",
        border: "rgba(147, 51, 234, 0.35)",
    },
    "Pós-termo": {
        bg: "rgba(147, 51, 234, 0.1)",
        t: "#9333ea",
        border: "rgba(147, 51, 234, 0.35)",
    },
}

/** Comparação clássica “tamanho de fruta” por semana gestacional */
const TAMANHO_FETO: Record<
    number,
    { emoji: string; comparacao: string; curiosidade: string }
> = {
    4: {
        emoji: "🌱",
        comparacao: "um grão de arroz",
        curiosidade: "O embrião acaba de se implantar no útero.",
    },
    5: {
        emoji: "🫘",
        comparacao: "um grão de milho",
        curiosidade:
            "O tubo neural — base do cérebro e da medula — já está se formando.",
    },
    6: {
        emoji: "🫛",
        comparacao: "uma lentilha",
        curiosidade: "O coração primitivo pode começar a bater esta semana.",
    },
    7: {
        emoji: "🫐",
        comparacao: "uma jabuticaba",
        curiosidade: "Braços e pernas aparecem como pequenos brotos.",
    },
    8: {
        emoji: "🫒",
        comparacao: "uma azeitona",
        curiosidade: "Todos os órgãos essenciais já estão esboçados.",
    },
    9: {
        emoji: "🍇",
        comparacao: "uma uva",
        curiosidade: "Os dedinhos das mãos e dos pés começam a se separar.",
    },
    10: {
        emoji: "🍓",
        comparacao: "um morango",
        curiosidade: "Os órgãos genitais internos já estão se diferenciando.",
    },
    11: {
        emoji: "🥝",
        comparacao: "um kiwi",
        curiosidade:
            "O bebê já abre e fecha a boca e pode engolir líquido amniótico.",
    },
    12: {
        emoji: "🍑",
        comparacao: "uma ameixa",
        curiosidade: "Reflexos aparecem — ele já pode cerrar os dedos.",
    },
    13: {
        emoji: "🍋",
        comparacao: "um limão",
        curiosidade: "As cordas vocais estão se formando.",
    },
    14: {
        emoji: "🍋",
        comparacao: "um limão-tahiti",
        curiosidade: "O rosto fica mais definido e a nuca fica mais reta.",
    },
    15: {
        emoji: "🍎",
        comparacao: "uma maçã",
        curiosidade: "Ele já consegue fazer caretas e mover os olhos.",
    },
    16: {
        emoji: "🥑",
        comparacao: "um abacate",
        curiosidade:
            "Algumas mães começam a sentir os primeiros movimentos agora.",
    },
    17: {
        emoji: "🍐",
        comparacao: "uma pera",
        curiosidade: "Gordura começa a se depositar sob a pele fina.",
    },
    18: {
        emoji: "🫑",
        comparacao: "um pimentão",
        curiosidade:
            "Orelhas, nariz e lábios ficam mais evidentes no ultrassom.",
    },
    19: {
        emoji: "🍊",
        comparacao: "uma laranja",
        curiosidade: "Vernix caseosa começa a proteger a pele delicada.",
    },
    20: {
        emoji: "🍌",
        comparacao: "uma banana",
        curiosidade: "Metade da gestação! Você pode sentir chutes mais claros.",
    },
    21: {
        emoji: "🥕",
        comparacao: "uma cenoura",
        curiosidade:
            "Movimentos de deglutição e respiração praticam os pulmões.",
    },
    22: {
        emoji: "🥒",
        comparacao: "um pepino",
        curiosidade: "Pestanas e sobrancelhas já estão presentes.",
    },
    23: {
        emoji: "🍆",
        comparacao: "uma berinjela pequena",
        curiosidade: "O cérebro cresce rapidamente e os sentidos se aprimoram.",
    },
    24: {
        emoji: "🌽",
        comparacao: "uma espiga de milho",
        curiosidade:
            "Marco de viabilidade — os pulmões avançam muito nesta fase.",
    },
    25: {
        emoji: "🥬",
        comparacao: "um repolho",
        curiosidade:
            "As mãos são bem formadas e ele pode brincar com o cordão.",
    },
    26: {
        emoji: "🍈",
        comparacao: "um melão amarelo",
        curiosidade: "Os olhos abrem pela primeira vez.",
    },
    27: {
        emoji: "🥦",
        comparacao: "um brócolis grande",
        curiosidade:
            "Última semana do 2º trimestre — o sono alterna entre REM e quieto.",
    },
    28: {
        emoji: "🎃",
        comparacao: "uma abóbora pequena",
        curiosidade:
            "Bem-vinda ao 3º trimestre! O cérebro dobra de complexidade.",
    },
    29: {
        emoji: "🥥",
        comparacao: "um coco",
        curiosidade:
            "Os ossos ficam mais densos e ele ganha peso de forma constante.",
    },
    30: {
        emoji: "🥬",
        comparacao: "um repolho grande",
        curiosidade: "A medula óssea assume a produção de glóbulos vermelhos.",
    },
    31: {
        emoji: "🍍",
        comparacao: "um abacaxi",
        curiosidade: "Os cinco sentidos estão ativos — ele reage a luz e som.",
    },
    32: {
        emoji: "🍈",
        comparacao: "um melão",
        curiosidade: "Ganha cerca de 200 g por semana nesta fase.",
    },
    33: {
        emoji: "🥭",
        comparacao: "um mamão",
        curiosidade: "O crânio permanece maleável para facilitar o parto.",
    },
    34: {
        emoji: "🍈",
        comparacao: "um mamão formosa",
        curiosidade:
            "Pulmões e sistema nervoso amadurecem para a vida fora do útero.",
    },
    35: {
        emoji: "🍈",
        comparacao: "um abacaxi grande",
        curiosidade: "Os rins estão totalmente desenvolvidos.",
    },
    36: {
        emoji: "🥬",
        comparacao: "uma alface americana",
        curiosidade: "Ele pode descer para a pelve e “engajar” para o parto.",
    },
    37: {
        emoji: "🥬",
        comparacao: "um pé de couve",
        curiosidade: "A partir daqui é considerado a termo precoce.",
    },
    38: {
        emoji: "🎃",
        comparacao: "uma abóbora média",
        curiosidade: "Unhas chegam à ponta dos dedos.",
    },
    39: {
        emoji: "🍉",
        comparacao: "uma melancia pequena",
        curiosidade:
            "O cérebro continua amadurecendo — ele já está quase pronto!",
    },
    40: {
        emoji: "🍉",
        comparacao: "uma melancia",
        curiosidade:
            "Data prevista! Só 5% dos bebês nascem exatamente no dia calculado.",
    },
}

/** Medidas aproximadas por semana: comprimento do bebê (cm) e
 *  altura uterina esperada (cm) — cadeia de altura da funda. */
const MEDIDAS_FETO_CM: Record<
    number,
    { tamanhoCm: string; alturaUterina: number }
> = {
    4: { tamanhoCm: "0,1 cm", alturaUterina: 2 },
    5: { tamanhoCm: "0,3 cm", alturaUterina: 2 },
    6: { tamanhoCm: "0,8 cm", alturaUterina: 3 },
    7: { tamanhoCm: "1 cm", alturaUterina: 3 },
    8: { tamanhoCm: "1,6 cm", alturaUterina: 4 },
    9: { tamanhoCm: "2,3 cm", alturaUterina: 4 },
    10: { tamanhoCm: "3 cm", alturaUterina: 5 },
    11: { tamanhoCm: "4 cm", alturaUterina: 5 },
    12: { tamanhoCm: "5,4 cm", alturaUterina: 6 },
    13: { tamanhoCm: "7 cm", alturaUterina: 8 },
    14: { tamanhoCm: "8,7 cm", alturaUterina: 10 },
    15: { tamanhoCm: "10 cm", alturaUterina: 12 },
    16: { tamanhoCm: "12 cm", alturaUterina: 14 },
    17: { tamanhoCm: "13,3 cm", alturaUterina: 15 },
    18: { tamanhoCm: "14,5 cm", alturaUterina: 16 },
    19: { tamanhoCm: "15,5 cm", alturaUterina: 17 },
    20: { tamanhoCm: "16,5 cm", alturaUterina: 18 },
    21: { tamanhoCm: "18 cm", alturaUterina: 19 },
    22: { tamanhoCm: "19,5 cm", alturaUterina: 20 },
    23: { tamanhoCm: "20,5 cm", alturaUterina: 21 },
    24: { tamanhoCm: "22 cm", alturaUterina: 22 },
    25: { tamanhoCm: "23,5 cm", alturaUterina: 23 },
    26: { tamanhoCm: "24,5 cm", alturaUterina: 24 },
    27: { tamanhoCm: "26 cm", alturaUterina: 25 },
    28: { tamanhoCm: "27 cm", alturaUterina: 26 },
    29: { tamanhoCm: "28,5 cm", alturaUterina: 27 },
    30: { tamanhoCm: "30 cm", alturaUterina: 28 },
    31: { tamanhoCm: "31,5 cm", alturaUterina: 29 },
    32: { tamanhoCm: "33 cm", alturaUterina: 30 },
    33: { tamanhoCm: "34,5 cm", alturaUterina: 31 },
    34: { tamanhoCm: "35 cm", alturaUterina: 32 },
    35: { tamanhoCm: "36,5 cm", alturaUterina: 33 },
    36: { tamanhoCm: "37,5 cm", alturaUterina: 34 },
    37: { tamanhoCm: "38,5 cm", alturaUterina: 35 },
    38: { tamanhoCm: "39 cm", alturaUterina: 36 },
    39: { tamanhoCm: "40 cm", alturaUterina: 37 },
    40: { tamanhoCm: "41 cm", alturaUterina: 38 },
}

interface Marco {
    semana: number
    titulo: string
    descricao: string
}

const MARCOS: Marco[] = [
    {
        semana: 6,
        titulo: "Batimentos cardíacos",
        descricao:
            "O coração fetal pode ser detectado no ultrassom transvaginal.",
    },
    {
        semana: 8,
        titulo: "Primeira consulta de pré-natal",
        descricao:
            "Ideal confirmar a gestação, iniciar ácido fólico/vitaminas e pedir exames iniciais.",
    },
    {
        semana: 10,
        titulo: "Risco de malformações — rastreio",
        descricao:
            "Período comum para translucência nucal e exames de 1º trimestre.",
    },
    {
        semana: 12,
        titulo: "Fim do 1º trimestre",
        descricao:
            "O risco de aborto espontâneo cai bastante. Náuseas tendem a melhorar.",
    },
    {
        semana: 16,
        titulo: "Possíveis primeiros movimentos",
        descricao:
            "Multíparas podem sentir “flutuações” ou “borboletas” no ventre.",
    },
    {
        semana: 20,
        titulo: "Ultrassom morfológico",
        descricao: "Exame detalhado da anatomia fetal — metade da jornada!",
    },
    {
        semana: 24,
        titulo: "Teste de tolerância à glicose",
        descricao:
            "Rastreio de diabetes gestacional costuma ser feito entre 24 e 28 semanas.",
    },
    {
        semana: 28,
        titulo: "Início do 3º trimestre",
        descricao:
            "Consultas podem ficar mais frequentes. Vacina dTpa é recomendada nesta fase.",
    },
    {
        semana: 32,
        titulo: "Contrações de Braxton-Hicks",
        descricao:
            "O útero pode “treinar” com contrações irregulares e indolores — normal!",
    },
    {
        semana: 34,
        titulo: "Maturidade pulmonar",
        descricao:
            "Se houver risco de parto prematuro, corticoide pode ser indicado pelo obstetra.",
    },
    {
        semana: 36,
        titulo: "Consultas semanais",
        descricao:
            "Monitoramento mais próximo. Bebê pode virar cabeça para baixo.",
    },
    {
        semana: 37,
        titulo: "Termo precoce",
        descricao: "Bebê é considerado a termo. Prepare a mala da maternidade!",
    },
    {
        semana: 39,
        titulo: "Termo completo",
        descricao:
            "Parto pode acontecer a qualquer momento. Observe sinais de trabalho de parto.",
    },
    {
        semana: 40,
        titulo: "Data provável do parto",
        descricao:
            "Se não houver parto, o obstetra discutirá indução ou expectativa conforme protocolo.",
    },
]

function startOfDay(d: Date) {
    const copy = new Date(d)
    copy.setHours(0, 0, 0, 0)
    return copy
}

/** Agenda mínima de consultas — Manual de Pré-Natal de Baixo Risco (MS) */
const AGENDA_CONSULTAS_MS: {
    titulo: string
    descricao: string
    semanas: number[]
}[] = [
    {
        titulo: "1ª consulta",
        descricao: "O quanto antes — idealmente até a 12ª semana",
        semanas: [],
    },
    {
        titulo: "Retornos mensais",
        descricao: "A cada 4 semanas até a 28ª semana",
        semanas: [16, 20, 24],
    },
    {
        titulo: "Retornos quinzenais",
        descricao: "Da 28ª à 36ª semana",
        semanas: [28, 30, 32, 34, 36],
    },
    {
        titulo: "Retornos semanais",
        descricao: "Após a 36ª semana até o parto",
        semanas: [37, 38, 39, 40, 41],
    },
]

/** Exames de rotina recomendados pelo MS, por trimestre.
 *  `de`/`ate` definem a janela gestacional ideal do exame (em semanas). */
const EXAMES_MS: {
    periodo: string
    tri: 1 | 2 | 3
    itens: { nome: string; de?: number; ate?: number }[]
}[] = [
    {
        periodo: "1º trimestre · 1ª consulta",
        tri: 1,
        itens: [
            { nome: "Tipagem sanguínea ABO/Rh" },
            { nome: "Hemograma completo" },
            { nome: "VDRL (sífilis)" },
            { nome: "HIV 1 e 2" },
            { nome: "Hepatite B (HBsAg) e Hepatite C" },
            { nome: "EAS + urocultura" },
            { nome: "Parasitológico de fezes" },
            { nome: "Glicemia de jejum" },
            { nome: "Toxoplasmose (IgG e IgM)" },
            { nome: "TSH" },
        ],
    },
    {
        periodo: "2º trimestre",
        tri: 2,
        itens: [
            { nome: "Ultrassom obstétrico (morfológica)", de: 18, ate: 24 },
            { nome: "Hemograma completo (repetir)" },
            { nome: "TOTG 75 g — rastreio diabetes gestacional", de: 24, ate: 28 },
            { nome: "Coombs indireto (gestante Rh negativo)", de: 28 },
        ],
    },
    {
        periodo: "3º trimestre",
        tri: 3,
        itens: [
            { nome: "Repetir VDRL, HIV e hemograma" },
            { nome: "Repetir EAS/urocultura" },
            { nome: "Anti-D (gestante Rh negativo)", de: 28 },
            { nome: "Swab para estreptococo B", de: 35, ate: 37 },
        ],
    },
]

/* ── Estratificação de risco gestacional (MS) ────────────────────────
 * Fatores baseados no Quadro 4 do Manual de Gestação de Alto Risco (MS, 2022)
 * e no Manual de Atenção ao Pré-Natal de Baixo Risco (MS, 2012).
 * Níveis: habitual (baixo) / intermediário (médio) / alto risco.
 * Se houver ≥1 fator de alto risco → ALTO. Senão, ≥1 fator intermediário → MÉDIO.
 * Senão → BAIXO. Sinais de alarme indicam urgência/emergência obstétrica. */

type NivelRisco = "medio" | "alto"

interface FatorRisco {
    id: string
    label: string
    nivel: NivelRisco
    alarme?: boolean
}

interface GrupoRisco {
    id: string
    titulo: string
    fatores: FatorRisco[]
}

const RISCOS_MS: GrupoRisco[] = [
    {
        id: "sociodemograficas",
        titulo: "Características individuais e sociodemográficas",
        fatores: [
            { id: "idade_limites", label: "Idade menor que 15 anos ou maior que 35 anos", nivel: "medio" },
            { id: "altura_baixa", label: "Altura menor que 1,45 m", nivel: "medio" },
            { id: "imc_baixo_sobrepeso", label: "IMC pré-gestacional < 18,5 ou entre 30 e 39,9 kg/m²", nivel: "medio" },
            { id: "trabalho_desfav", label: "Condições de trabalho desfavoráveis (esforço físico excessivo, carga horária extensa, exposição a agentes físicos/químicos/biológicos nocivos, estresse)", nivel: "medio" },
            { id: "violencia", label: "Indícios ou ocorrência de violência doméstica ou de gênero", nivel: "medio" },
            { id: "conjugal_insegura", label: "Situação conjugal insegura", nivel: "medio" },
            { id: "apoio_familiar", label: "Insuficiência de apoio familiar", nivel: "medio" },
            { id: "autocuidado", label: "Capacidade de autocuidado insuficiente", nivel: "medio" },
            { id: "nao_aceitacao", label: "Não aceitação da gestação", nivel: "medio" },
            { id: "baixa_escolaridade", label: "Baixa escolaridade (menos de 5 anos de estudo)", nivel: "medio" },
            { id: "teratogenicos", label: "Uso de medicamentos teratogênicos", nivel: "medio" },
            { id: "ansiedade_leve", label: "Transtorno depressivo ou de ansiedade leve", nivel: "medio" },
            { id: "etilismo_dependencia", label: "Etilismo com indicativo de dependência (ex.: CAGE ≥ 2)", nivel: "medio" },
            { id: "tabagismo_dependencia", label: "Tabagismo com indicativo de dependência elevada (ex.: Fagerström ≥ 8)", nivel: "medio" },
            { id: "drogas", label: "Dependência e/ou uso abusivo de drogas", nivel: "alto" },
            { id: "agravos_nutricionais", label: "Agravos alimentares ou nutricionais: IMC ≥ 40, desnutrição, carências nutricionais (hipovitaminoses), transtornos alimentares (anorexia, bulimia)", nivel: "alto" },
            { id: "situacao_rua_indigenas", label: "Gestante em situação de rua, de comunidades indígenas, quilombolas ou migrantes", nivel: "alto" },
        ],
    },
    {
        id: "reprodutiva",
        titulo: "História reprodutiva anterior",
        fatores: [
            { id: "abortos_aprecoce", label: "Abortos precoces (até 12 semanas) em gestações anteriores (até 2 consecutivos)", nivel: "medio" },
            { id: "pe_grave_prev", label: "Histórico de pré-eclâmpsia grave ou eclâmpsia em gestação anterior", nivel: "medio" },
            { id: "ies_prev", label: "Insuficiência istmo-cervical prévia", nivel: "alto" },
            { id: "crescimento_prev", label: "Alterações no crescimento intrauterino (restrição de crescimento fetal e macrossomia)", nivel: "alto" },
            { id: "malformacao_prev", label: "Malformação fetal anterior", nivel: "alto" },
            { id: "nulipara_multipara", label: "Nuliparidade ou multiparidade (5 ou mais partos)", nivel: "alto" },
            { id: "dmg_prev", label: "Diabetes gestacional em gestação anterior", nivel: "alto" },
            { id: "sindr_hemo_hip_prev", label: "Síndromes hemorrágicas ou hipertensivas sem critérios de gravidade", nivel: "alto" },
            { id: "cesareas_2mais", label: "Cesáreas prévias (2 ou mais)", nivel: "alto" },
            { id: "intervalo_interpartal", label: "Intervalo interpartal menor que 2 anos", nivel: "alto" },
            { id: "abortamento_habitual", label: "Abortamento habitual/recorrente (3 ou mais abortamentos consecutivos)", nivel: "alto" },
            { id: "aborto_tardio_morte", label: "Aborto tardio ou morte perinatal explicada ou inexplicada", nivel: "alto" },
            { id: "isoimun_rh_prev", label: "Isoimunização Rh em gestação anterior", nivel: "alto" },
            { id: "acretismo_prev", label: "Acretismo placentário prévio", nivel: "alto" },
            { id: "pe_hellp_prev", label: "Pré-eclâmpsia grave ou síndrome HELLP prévias", nivel: "alto" },
            { id: "prematuridade_prev", label: "Prematuridade anterior", nivel: "alto" },
            { id: "cesarea_incisao_classe", label: "Cesariana prévia com incisão clássica/corporal/longitudinal", nivel: "alto" },
        ],
    },
    {
        id: "clinicas_previas",
        titulo: "Condições clínicas prévias à gestação",
        fatores: [
            { id: "asma_controlada", label: "Asma controlada sem uso de medicamento contínuo", nivel: "medio" },
            { id: "hipotireoidismo_subclinico", label: "Hipotireoidismo subclínico diagnosticado na gestação", nivel: "medio" },
            { id: "pneumopatias_graves", label: "Pneumopatias graves (asma em uso de medicamento contínuo, DPOC, fibrose cística)", nivel: "alto" },
            { id: "nefropatias_graves", label: "Nefropatias graves (insuficiência renal, rins policísticos)", nivel: "alto" },
            { id: "endocrinopatias", label: "Endocrinopatias (diabetes mellitus, hipotireoidismo em uso de medicamento, hipertireoidismo)", nivel: "alto" },
            { id: "cardiopatias", label: "Cardiopatias (valvulopatias, arritmias, endocardite) ou infarto agudo do miocárdio", nivel: "alto" },
            { id: "hematologicas", label: "Doenças hematológicas (doença falciforme, PTI/PTT, talassemias, coagulopatias)", nivel: "alto" },
            { id: "neurologicas", label: "Doenças neurológicas (epilepsia, AVC, déficits motores graves)", nivel: "alto" },
            { id: "ginecopatias", label: "Ginecopatias (malformações uterinas, útero bicorno, miomas grandes, cirurgia uterina)", nivel: "alto" },
            { id: "neoplasias", label: "Neoplasias (quadro suspeito, diagnosticado ou em tratamento)", nivel: "alto" },
            { id: "infecciosas_previas", label: "Doenças infecciosas: HIV/aids, sífilis terciária/resistente, toxoplasmose, rubéola, CMV, tuberculose, hanseníase, hepatites", nivel: "alto" },
            { id: "psiquiatrica_grave", label: "Doença psiquiátrica grave (psicose, depressão grave, transtorno bipolar)", nivel: "alto" },
            { id: "autoimunes", label: "Doenças autoimunes (ex.: lúpus eritematoso sistêmico)", nivel: "alto" },
            { id: "tromboembolismo", label: "Antecedentes de tromboembolismo", nivel: "alto" },
            { id: "transplantes_cancer", label: "Transplantes ou câncer diagnosticado", nivel: "alto" },
        ],
    },
    {
        id: "intercorrencias_atuais",
        titulo: "Intercorrências clínicas/obstétricas na gestação atual",
        fatores: [
            { id: "itu_ate2", label: "Infecção urinária (até 2 ocorrências) ou 1 episódio de pielonefrite", nivel: "medio" },
            { id: "ganho_peso_inadequado", label: "Ganho de peso inadequado (insuficiente ou excessivo)", nivel: "medio" },
            { id: "anemia_leve", label: "Anemia leve a moderada (hemoglobina entre 9 e 11 g/dL)", nivel: "medio" },
            { id: "sifilis_tx_herpes", label: "Doenças infecciosas: sífilis (exceto terciária/resistente), toxoplasmose aguda sem repercussão fetal, herpes simples", nivel: "medio" },
            { id: "dengue_zika_chik", label: "Suspeita ou confirmação de dengue, vírus zika ou chikungunya (quadro febril exantemático)", nivel: "medio" },
            { id: "rciu_suspeita", label: "Restrição de crescimento fetal suspeita", nivel: "medio" },
            { id: "macro_acima_p90", label: "Feto acima do percentil 90% ou suspeita de macrossomia", nivel: "medio" },
            { id: "pe_grave_precoce", label: "Pré-eclâmpsia grave ou de instalação precoce (antes de 34 semanas)", nivel: "alto", alarme: true },
            { id: "tromboembolismo_atual", label: "Tromboembolismo na gestação", nivel: "alto" },
            { id: "itu_repeticao", label: "Infecção urinária de repetição: 3 ou mais episódios de ITU baixa ou 2 ou mais de pielonefrite", nivel: "alto" },
            { id: "infecciosas_graves", label: "Doenças infecciosas de alto risco: sífilis terciária/resistente ou com achados ecográficos de sífilis congênita, toxoplasmose aguda com suspeita de repercussão fetal, rubéola, CMV, HIV/aids na gestação", nivel: "alto", alarme: true },
            { id: "rciu_confirmada", label: "Restrição de crescimento fetal confirmada", nivel: "alto" },
            { id: "devio_liquido", label: "Desvios da quantidade de líquido amniótico (oligoidrâmnio/polidrâmnio)", nivel: "alto" },
            { id: "isoimun_rh_atual", label: "Isoimunização Rh na gestação atual", nivel: "alto" },
            { id: "iec_atual", label: "Insuficiência istmocervical diagnosticada na gestação atual", nivel: "alto" },
            { id: "tpp_inibido", label: "Trabalho de parto pré-termo inibido na gestação atual", nivel: "alto", alarme: true },
            { id: "anemia_grave", label: "Anemia grave (hemoglobina < 9 g/dL) ou refratária ao tratamento", nivel: "alto" },
            { id: "hemorragias_atuais", label: "Hemorragias na gestação atual", nivel: "alto", alarme: true },
            { id: "placenta_previa", label: "Placenta prévia (diagnóstico confirmado após 22 semanas)", nivel: "alto", alarme: true },
            { id: "acretismo_atual", label: "Acretismo placentário", nivel: "alto" },
            { id: "colestase_gestacional", label: "Colestase gestacional (prurido gestacional ou icterícia persistente)", nivel: "alto" },
            { id: "malformacao_arritmia_fetal", label: "Malformação fetal ou arritmia cardíaca fetal", nivel: "alto", alarme: true },
            { id: "gemelharidade", label: "Gestação gemelar", nivel: "medio" },
            { id: "patologia_clinica_atual", label: "Qualquer patologia clínica que repercuta na gestação ou necessite de acompanhamento clínico especializado", nivel: "alto", alarme: true },
        ],
    },
]

const LABEL_NIVEL_RISCO: Record<string, string> = {
    baixo: "Baixo risco (risco habitual)",
    medio: "Médio risco (risco intermediário)",
    alto: "Alto risco",
}

const CONDUTA_RISCO: Record<string, string> = {
    baixo: "Pré-natal na APS, rotina de consultas conforme MS. Reclassificar o risco a cada consulta.",
    medio: "Pré-natal na APS com vigilância reforçada; considerar apoio da equipe especializada/AAE e reavaliação periódica.",
    alto: "Encaminhar para pré-natal de alto risco (atenção ambulatorial especializada); manter vínculo com a APS.",
}

interface ResultadoRisco {
    nivel: "baixo" | "medio" | "alto"
    fatores: string[]
    temAlarme: boolean
}

function calcularRiscoGestacional(marcados: Record<string, boolean>): ResultadoRisco {
    const fatores: string[] = []
    let temAlto = false
    let temMedio = false
    let temAlarme = false

    for (const grupo of RISCOS_MS) {
        for (const fator of grupo.fatores) {
            if (marcados[fator.id]) {
                fatores.push(fator.label)
                if (fator.nivel === "alto") temAlto = true
                else temMedio = true
                if (fator.alarme) temAlarme = true
            }
        }
    }

    return {
        nivel: temAlto ? "alto" : temMedio ? "medio" : "baixo",
        fatores,
        temAlarme,
    }
}

function addDays(d: Date, days: number) {
    const copy = new Date(d)
    copy.setDate(copy.getDate() + days)
    return copy
}

function formatDateBR(d: Date) {
    return d.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
    })
}

function formatDateCurta(d: Date) {
    const day = String(d.getDate()).padStart(2, "0")
    const month = String(d.getMonth() + 1).padStart(2, "0")
    const year = d.getFullYear()
    return `${day}/${month}/${year}`
}

function formatIgCurta(semanas: number, dias: number) {
    if (semanas === 0) return `${dias}d`
    return `${semanas}s${dias}d`
}

function formatIgCopia(semanas: number, dias: number, dpp: Date) {
    return `IG: ${formatIgCurta(semanas, dias)} | DPP: ${formatDateCurta(dpp)}`
}

function diasEntre(a: Date, b: Date) {
    const ms = startOfDay(b).getTime() - startOfDay(a).getTime()
    return Math.floor(ms / (1000 * 60 * 60 * 24))
}

function obterTrimestre(semanas: number) {
    if (semanas < 14) return "1º Trimestre"
    if (semanas < 28) return "2º Trimestre"
    return "3º Trimestre"
}

function clampSemana(semanas: number) {
    return Math.min(40, Math.max(4, semanas))
}

function obterTamanho(semana: number) {
    const s = clampSemana(semana)
    return TAMANHO_FETO[s] ?? TAMANHO_FETO[40]
}

function obterMedidas(semana: number) {
    const s = clampSemana(semana)
    return MEDIDAS_FETO_CM[s] ?? MEDIDAS_FETO_CM[40]
}

function obterMarcos(semanaAtual: number) {
    const agora = MARCOS.filter((m) => m.semana === semanaAtual)
    const emBreve = MARCOS.filter(
        (m) => m.semana > semanaAtual && m.semana <= semanaAtual + 3
    )
    return { agora, emBreve }
}

function calcularDumPartirDeUs(
    usDate: string,
    semanas: number,
    dias: number
): Date | null {
    if (!usDate) return null
    const us = startOfDay(new Date(usDate + "T12:00:00"))
    if (isNaN(us.getTime())) return null
    const totalDiasIdade = semanas * 7 + dias
    if (totalDiasIdade <= 0) return null
    return addDays(us, -totalDiasIdade)
}

interface ResolucaoFonte {
    dumEfetiva: Date
    fonte: "dum" | "us"
    diffDias: number | null
    semanaUsExame: number | null
    motivo: string
}

function resolverFonte(
    dum: string,
    usDate: string,
    usSemanas: number,
    usDias: number
): ResolucaoFonte | null {
    const temDum = !!dum
    const temUs = !!usDate && (usSemanas > 0 || usDias > 0)

    if (!temDum && !temUs) return null

    if (temDum && !temUs) {
        const lmp = startOfDay(new Date(dum + "T12:00:00"))
        if (isNaN(lmp.getTime())) return null
        return {
            dumEfetiva: lmp,
            fonte: "dum",
            diffDias: null,
            semanaUsExame: null,
            motivo: "Utilizando apenas a DUM informada.",
        }
    }

    if (!temDum && temUs) {
        const dumCalculada = calcularDumPartirDeUs(usDate, usSemanas, usDias)
        if (!dumCalculada) return null
        const semanaUsExame = Math.floor(diasEntre(dumCalculada, startOfDay(new Date(usDate + "T12:00:00"))) / 7)
        return {
            dumEfetiva: dumCalculada,
            fonte: "us",
            diffDias: null,
            semanaUsExame,
            motivo: `DUM calculada a partir do ultrassom (${usSemanas}s${usDias}d).`,
        }
    }

    const lmp = startOfDay(new Date(dum + "T12:00:00"))
    const dumCalculada = calcularDumPartirDeUs(usDate, usSemanas, usDias)
    if (isNaN(lmp.getTime()) || !dumCalculada) return null

    const diffDias = Math.abs(diasEntre(lmp, dumCalculada))
    const semanaUsExame = Math.floor(diasEntre(dumCalculada, startOfDay(new Date(usDate + "T12:00:00"))) / 7)

    if (semanaUsExame < 9) {
        if (diffDias > 5) {
            return {
                dumEfetiva: dumCalculada,
                fonte: "us",
                diffDias,
                semanaUsExame,
                motivo: `Ultrassom antes de 9 semanas com diferença de ${diffDias} dias (>5 dias) → DPP ajustada pelo ultrassom.`,
            }
        }
        return {
            dumEfetiva: lmp,
            fonte: "dum",
            diffDias,
            semanaUsExame,
            motivo: `Ultrassom antes de 9 semanas com diferença de ${diffDias} dias (≤5 dias) → DUM mantida.`,
        }
    }

    if (semanaUsExame < 14) {
        if (diffDias > 7) {
            return {
                dumEfetiva: dumCalculada,
                fonte: "us",
                diffDias,
                semanaUsExame,
                motivo: `Ultrassom entre 9 e 13 semanas com diferença de ${diffDias} dias (>7 dias) → DPP ajustada pelo ultrassom.`,
            }
        }
        return {
            dumEfetiva: lmp,
            fonte: "dum",
            diffDias,
            semanaUsExame,
            motivo: `Ultrassom entre 9 e 13 semanas com diferença de ${diffDias} dias (≤7 dias) → DUM mantida.`,
        }
    }

    return {
        dumEfetiva: lmp,
        fonte: "dum",
        diffDias,
        semanaUsExame,
        motivo: `Ultrassom após 14 semanas — não é recomendado redatamento. DUM mantida.`,
    }
}

interface ResultadoGestacional {
    semanas: number
    dias: number
    totalDias: number
    trimestre: string
    dum: Date
    dpp: Date
    diasRestantes: number
    percentual: number
    tamanho: (typeof TAMANHO_FETO)[number]
    medidas: (typeof MEDIDAS_FETO_CM)[number]
    marcos: ReturnType<typeof obterMarcos>
    valido: boolean
    mensagemErro?: string
}

function calcularGestacao(dum: string): ResultadoGestacional | null {
    if (!dum) return null

    const lmp = startOfDay(new Date(dum + "T12:00:00"))
    const hoje = startOfDay(new Date())

    if (isNaN(lmp.getTime())) {
        return {
            semanas: 0,
            dias: 0,
            totalDias: 0,
            trimestre: "",
            dum: hoje,
            dpp: hoje,
            diasRestantes: 0,
            percentual: 0,
            tamanho: TAMANHO_FETO[4],
            medidas: MEDIDAS_FETO_CM[4],
            marcos: { agora: [], emBreve: [] },
            valido: false,
            mensagemErro: "Data inválida.",
        }
    }

    const totalDias = diasEntre(lmp, hoje)

    if (totalDias < 0) {
        return {
            semanas: 0,
            dias: 0,
            totalDias,
            trimestre: "",
            dum: lmp,
            dpp: addDays(lmp, 280),
            diasRestantes: 0,
            percentual: 0,
            tamanho: TAMANHO_FETO[4],
            medidas: MEDIDAS_FETO_CM[4],
            marcos: { agora: [], emBreve: [] },
            valido: false,
            mensagemErro: "A DUM não pode ser uma data futura.",
        }
    }

    if (totalDias > 294) {
        return {
            semanas: Math.floor(totalDias / 7),
            dias: totalDias % 7,
            totalDias,
            trimestre: "Pós-termo",
            dum: lmp,
            dpp: addDays(lmp, 280),
            diasRestantes: 0,
            percentual: 100,
            tamanho: TAMANHO_FETO[40],
            medidas: MEDIDAS_FETO_CM[40],
            marcos: obterMarcos(40),
            valido: true,
            mensagemErro:
                "Gestação acima de 42 semanas — acompanhamento obstétrico é essencial.",
        }
    }

    const semanas = Math.floor(totalDias / 7)
    const dias = totalDias % 7
    const dpp = addDays(lmp, 280)
    const diasRestantes = Math.max(0, diasEntre(hoje, dpp))
    const percentual = Math.min(100, Math.round((totalDias / 280) * 100))
    const semanaParaTamanho = semanas < 4 ? 4 : semanas
    const trimestre = obterTrimestre(semanas)

    return {
        semanas,
        dias,
        totalDias,
        trimestre,
        dum: lmp,
        dpp,
        diasRestantes,
        percentual,
        tamanho: obterTamanho(semanaParaTamanho),
        medidas: obterMedidas(semanaParaTamanho),
        marcos: obterMarcos(semanas),
        valido: true,
    }
}

interface Props {
    style?: React.CSSProperties
}

const MARCO_T2 = (14 / 40) * 100 // 35%
const MARCO_T3 = (28 / 40) * 100 // 70%

function IconeCopiar() {
    return (
        <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
    )
}

function IconeCheck() {
    return (
        <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <polyline points="20 6 9 17 4 12" />
        </svg>
    )
}

function BarraProgressoGestacional({
    percentual,
}: {
    percentual: number
}) {
    const pos = Math.min(100, Math.max(0, percentual))

    return (
        <div className="gest-progress-wrap">
            <div className="gest-progress-track">
                <div
                    className="gest-progress-seg gest-progress-seg--t1"
                    style={{ width: `${MARCO_T2}%` }}
                />
                <div
                    className="gest-progress-seg gest-progress-seg--t2"
                    style={{ width: `${MARCO_T3 - MARCO_T2}%` }}
                />
                <div
                    className="gest-progress-seg gest-progress-seg--t3"
                    style={{ width: `${100 - MARCO_T3}%` }}
                />
                <div
                    className="gest-progress-fill"
                    style={{ left: `${pos}%`, width: `${100 - pos}%` }}
                />
                <div
                    className="gest-progress-marker gest-progress-marker--dum"
                    style={{ left: "0%" }}
                    title="DUM"
                />
                <div
                    className="gest-progress-marker"
                    style={{ left: `${MARCO_T2}%` }}
                    title="2º trimestre"
                />
                <div
                    className="gest-progress-marker"
                    style={{ left: `${MARCO_T3}%` }}
                    title="3º trimestre"
                />
                <div
                    className="gest-progress-marker gest-progress-marker--dpp"
                    style={{ left: "100%" }}
                    title="DPP"
                />
                <div
                    className="gest-progress-thumb"
                    style={{ left: `${pos}%` }}
                >
                    👶
                </div>
            </div>
            <div className="gest-progress-labels">
                <span>DUM</span>
                <span>1º Tri</span>
                <span>2º Tri</span>
                <span>3º Tri</span>
                <span>DPP</span>
            </div>
        </div>
    )
}

function BotaoCopiar({ texto }: { texto: string }) {
    const [copiado, setCopiado] = useState(false)

    const copiar = async () => {
        try {
            await navigator.clipboard.writeText(texto)
            setCopiado(true)
            setTimeout(() => setCopiado(false), 2000)
        } catch {
            /* fallback silencioso em ambientes sem clipboard */
        }
    }

    return (
        <button
            type="button"
            className={`gest-copy-btn${copiado ? " gest-copy-btn--ok" : ""}`}
            onClick={copiar}
            title={copiado ? "Copiado!" : "Copiar IG e DPP"}
            aria-label="Copiar idade gestacional e data provável do parto"
        >
            {copiado ? <IconeCheck /> : <IconeCopiar />}
        </button>
    )
}

function CardMarco({ marco, tipo }: { marco: Marco; tipo: "now" | "soon" }) {
    return (
        <div
            className={`gest-milestone gest-milestone--${tipo === "now" ? "now" : "soon"}`}
        >
            <span className="gest-milestone-tag">
                {tipo === "now" ? "Agora" : "Em breve"} · Semana {marco.semana}
            </span>
            <span className="gest-milestone-title">{marco.titulo}</span>
            <p className="gest-milestone-desc">{marco.descricao}</p>
        </div>
    )
}

function ItemRisco({
    fator,
    marcado,
    aoMarcar,
}: {
    fator: FatorRisco
    marcado: boolean
    aoMarcar: (id: string) => void
}) {
    return (
        <label className="gest-risk-item">
            <input
                type="checkbox"
                className="gest-risk-check"
                checked={marcado}
                onChange={() => aoMarcar(fator.id)}
            />
            <span className="gest-risk-label">{fator.label}</span>
        </label>
    )
}

function BlocoRisco({
    grupo,
    marcados,
    aoMarcar,
}: {
    grupo: GrupoRisco
    marcados: Record<string, boolean>
    aoMarcar: (id: string) => void
}) {
    const medios = grupo.fatores.filter((f) => f.nivel === "medio")
    const altos = grupo.fatores.filter((f) => f.nivel === "alto")

    return (
        <div className="gest-risk-grupo">
            <div className="gest-risk-grupo-titulo">{grupo.titulo}</div>
            <div className="gest-risk-list">
                {medios.length > 0 && (
                    <div className="gest-risk-sublabel">Médio risco</div>
                )}
                {medios.map((fator) => (
                    <ItemRisco
                        key={fator.id}
                        fator={fator}
                        marcado={!!marcados[fator.id]}
                        aoMarcar={aoMarcar}
                    />
                ))}
                {altos.length > 0 && (
                    <div className="gest-risk-sublabel gest-risk-sublabel--alto">
                        Alto risco
                    </div>
                )}
                {altos.map((fator) => (
                    <ItemRisco
                        key={fator.id}
                        fator={fator}
                        marcado={!!marcados[fator.id]}
                        aoMarcar={aoMarcar}
                    />
                ))}
            </div>
        </div>
    )
}

function formatDiaMes(d: Date) {
    const dia = String(d.getDate()).padStart(2, "0")
    const mes = String(d.getMonth() + 1).padStart(2, "0")
    return `${dia}/${mes}`
}

function RotinaPreNatal({ dum, semanas }: { dum: Date; semanas: number }) {
    const dataSemana = (sem: number) => formatDiaMes(addDays(dum, sem * 7))
    const triAtual = semanas < 14 ? 1 : semanas < 28 ? 2 : 3

    // próxima consulta agendada (semana mais próxima acima da atual)
    const todasSemanas = AGENDA_CONSULTAS_MS.flatMap((a) => a.semanas)
    const proximaSemana = todasSemanas
        .filter((s) => s > semanas)
        .sort((a, b) => a - b)[0]
    const triProxima =
        proximaSemana === undefined
            ? 0
            : proximaSemana < 14
              ? 1
              : proximaSemana < 28
                ? 2
                : 3

    // estado de um exame com janela gestacional
    const estadoJanela = (de?: number, ate?: number) => {
        if (de === undefined && ate === undefined) return null
        const inicio = de ?? 4
        const fim = ate ?? 42
        if (semanas > fim) return "passou"
        if (semanas >= inicio) return "agora"
        return "vai"
    }

    return (
        <>
            <div className="gest-card gest-routine">
                <div style={styles.cardTitle}>Consultas</div>
                <div className="gest-routine-items">
                        {AGENDA_CONSULTAS_MS.map((item) => (
                            <div
                                className={`gest-routine-item${item.semanas.length > 0 && item.semanas.every((s) => s <= semanas) ? " gest-routine-item--done" : ""}${proximaSemana !== undefined && item.semanas.includes(proximaSemana) ? " gest-routine-item--next gest-routine-item--t" + triProxima : ""}`}
                                key={item.titulo}
                            >
                                <span className="gest-routine-item-title">
                                    {item.titulo}
                                    {item.semanas.length > 0 &&
                                        item.semanas.every(
                                            (s) => s <= semanas
                                        ) && (
                                            <span className="gest-routine-chip gest-routine-chip--done">
                                                concluído
                                            </span>
                                        )}
                                </span>
                                <span className="gest-routine-item-desc">
                                    {item.descricao}
                                    {(item.semanas.length > 0 ||
                                        item.titulo === "1ª consulta") && (
                                        <span className="gest-routine-weeks">
                                            {item.semanas.map((s) => (
                                                <span
                                                    key={s}
                                                    className={`gest-routine-week${s <= semanas ? " gest-routine-week--done" : ""}${s === proximaSemana ? " gest-routine-week--next gest-routine-chip--t" + triProxima : ""}`}
                                                >
                                                    {s}s ({dataSemana(s)})
                                                </span>
                                            ))}
                                            {item.titulo === "1ª consulta" && (
                                                <span
                                                    className={`gest-routine-week${semanas > 12 ? " gest-routine-week--done" : ""}`}
                                                >
                                                    idealmente até{" "}
                                                    {formatDateCurta(
                                                        addDays(dum, 84)
                                                    )}
                                                </span>
                                            )}
                                        </span>
                                    )}
                                </span>
                            </div>
                        ))}
                </div>
            </div>

            <div className="gest-card gest-routine">
                <div style={styles.cardTitle}>Exames recomendados</div>
                    {EXAMES_MS.map((grupo) => {
                        const estadoTri =
                            grupo.tri < triAtual
                                ? "done"
                                : grupo.tri === triAtual
                                  ? "now"
                                  : "todo"
                        const chipLabel =
                            estadoTri === "done"
                                ? "período concluído"
                                : estadoTri === "now"
                                  ? "em curso"
                                  : "à frente"
                        return (
                            <div
                                className={`gest-routine-item gest-routine-item--t${grupo.tri}${estadoTri === "now" ? " gest-routine-item--cur" : ""}${estadoTri === "done" ? " gest-routine-item--past" : ""}`}
                                key={grupo.periodo}
                            >
                                <span className="gest-routine-item-title">
                                    {grupo.periodo}
                                    <span
                                        className={`gest-routine-chip gest-routine-chip--t${grupo.tri}`}
                                    >
                                        {chipLabel}
                                    </span>
                                </span>
                                <div className="gest-routine-list">
                                    {grupo.itens.map((exame) => {
                                        const estado = estadoJanela(
                                            exame.de,
                                            exame.ate
                                        )
                                        return (
                                            <div
                                                className="gest-routine-li"
                                                key={exame.nome}
                                            >
                                                {exame.nome}
                                                {exame.de !== undefined && (
                                                    <span className="gest-routine-janela">
                                                        {" "}
                                                        ({exame.de}
                                                        {exame.ate !== undefined
                                                            ? `–${exame.ate}`
                                                            : ""}
                                                        s ·{" "}
                                                        {dataSemana(exame.de)}
                                                        {exame.ate !== undefined
                                                            ? `–${dataSemana(exame.ate)}`
                                                            : ""}
                                                        )
                                                    </span>
                                                )}
                                                {estado === "agora" && (
                                                    <span className="gest-routine-flag gest-routine-flag--ok">
                                                        agora
                                                    </span>
                                                )}
                                                {estado === "passou" && (
                                                    <span className="gest-routine-flag gest-routine-flag--late">
                                                        janela passou
                                                    </span>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )
                    })}
            </div>
        </>
    )
}

export default forwardRef<CompanionActions, Props>(function CalculadoraGestacional({ style }: Props, ref) {
    const [activeTab, setActiveTab] = useState<"calc" | "risco">("calc")

    const [dum, setDum] = useState("")
    const [usDate, setUsDate] = useState("")
    const [usSemanas, setUsSemanas] = useState("")
    const [usDias, setUsDias] = useState("")

    const [riscoMarcados, setRiscoMarcados] = useState<Record<string, boolean>>({})

    const riscoResultado = useMemo(
        () => calcularRiscoGestacional(riscoMarcados),
        [riscoMarcados]
    )

    const toggleRiscoFator = (id: string) => {
        setRiscoMarcados(prev => ({ ...prev, [id]: !prev[id] }))
    }

    const resolucao = useMemo(
        () => resolverFonte(dum, usDate, parseInt(usSemanas) || 0, parseInt(usDias) || 0),
        [dum, usDate, usSemanas, usDias]
    )

    const dumEfetivaStr = useMemo(() => {
        if (!resolucao) return ""
        const y = resolucao.dumEfetiva.getFullYear()
        const m = String(resolucao.dumEfetiva.getMonth() + 1).padStart(2, "0")
        const d = String(resolucao.dumEfetiva.getDate()).padStart(2, "0")
        return `${y}-${m}-${d}`
    }, [resolucao])

    const resultado = useMemo(() => calcularGestacao(dumEfetivaStr), [dumEfetivaStr])

    const getOutputRef = useRef<(groupId: string) => string | null>(() => null)
    getOutputRef.current = (groupId: string): string | null => {
        if (groupId === "ig_dpp" && resultado?.valido) {
            const src = resolucao?.fonte === "us" ? " (via US)" : ""
            return `IG: ${formatIgCurta(resultado.semanas, resultado.dias)} | DPP: ${formatDateCurta(resultado.dpp)}${src}`
        }
        if (groupId === "risco" && riscoResultado.fatores.length > 0) {
            const fatorLista = riscoResultado.fatores.join("; ")
            const alarme = riscoResultado.temAlarme
                ? " | Sinais de alarme — avaliar em urgência/emergência obstétrica."
                : ""
            return `Risco gestacional (MS): ${LABEL_NIVEL_RISCO[riscoResultado.nivel]} (${CONDUTA_RISCO[riscoResultado.nivel]}) | Fatores: ${fatorLista}${alarme}`
        }
        return null
    }

    useImperativeHandle(ref, () => ({
        getOutput: (groupId: string) => getOutputRef.current(groupId),
        reset() {
            setActiveTab("calc")
            setDum(""); setUsDate(""); setUsSemanas(""); setUsDias("")
            setRiscoMarcados({})
        },
    }), [])

    const cores =
        resultado && TRIMESTRE_CORES[resultado.trimestre]
            ? TRIMESTRE_CORES[resultado.trimestre]
            : TRIMESTRE_CORES["2º Trimestre"]

    const idadeGestacional =
        resultado && resultado.valido
            ? resultado.semanas === 0
                ? `${resultado.dias} ${resultado.dias === 1 ? "dia" : "dias"}`
                : `${resultado.semanas} ${resultado.semanas === 1 ? "semana" : "semanas"} e ${resultado.dias} ${resultado.dias === 1 ? "dia" : "dias"}`
            : null

    const textoCopia =
        resultado && resultado.valido
            ? formatIgCopia(resultado.semanas, resultado.dias, resultado.dpp) +
              (resolucao?.fonte === "us" ? " (via US)" : "")
            : ""

    const temEntrada = !!dum || (!!usDate && (parseInt(usSemanas) > 0 || parseInt(usDias) > 0))

    return (
        <div style={{ ...styles.container, ...style }}>
            <style dangerouslySetInnerHTML={{ __html: injectStyles }} />

            <div className="gest-tabs">
                <div
                    className={`gest-tab${activeTab === "calc" ? " gest-tab--ativo" : ""}`}
                    onClick={() => setActiveTab("calc")}
                >
                    Calculadora
                </div>
                <div
                    className={`gest-tab${activeTab === "risco" ? " gest-tab--ativo" : ""}`}
                    onClick={() => setActiveTab("risco")}
                >
                    Risco
                </div>
            </div>

            {activeTab === "calc" ? (
            <>
            <div style={styles.title}>Calculadora gestacional</div>
            <div style={styles.subtitle}>
                para idade gestacional e data provável do parto
            </div>

            <div className="gest-inputs-row">
                <div className="gest-inputs-line">
                    <div className="gest-field gest-field--dum">
                        <span className="gest-field-label">DUM</span>
                        <input
                            type="date"
                            value={dum}
                            max={new Date().toISOString().split("T")[0]}
                            onChange={(e) => setDum(e.target.value)}
                            style={styles.input}
                        />
                    </div>
                    <span className="gest-ou">ou</span>
                    <div className="gest-field gest-field--date">
                        <span className="gest-field-label">Data do US</span>
                        <input
                            type="date"
                            value={usDate}
                            max={new Date().toISOString().split("T")[0]}
                            onChange={(e) => setUsDate(e.target.value)}
                            style={styles.input}
                        />
                    </div>
                    <div className="gest-field gest-field--narrow">
                        <span className="gest-field-label">Semanas</span>
                        <input
                            type="number"
                            min={0}
                            max={41}
                            placeholder="0"
                            value={usSemanas}
                            onChange={(e) => setUsSemanas(e.target.value)}
                            style={styles.input}
                        />
                    </div>
                    <div className="gest-field gest-field--narrow">
                        <span className="gest-field-label">Dias</span>
                        <input
                            type="number"
                            min={0}
                            max={6}
                            placeholder="0"
                            value={usDias}
                            onChange={(e) => setUsDias(e.target.value)}
                            style={styles.input}
                        />
                    </div>
                </div>
            </div>

            {!temEntrada ? (
                <div style={{ ...styles.empty, marginTop: "20px" }}>
                    Informe a DUM ou os dados do ultrassom para ver o
                    acompanhamento da gestação.
                </div>
            ) : !resultado || !resultado.valido ? (
                <div
                    style={{
                        ...styles.empty,
                        marginTop: "20px",
                        borderColor: "rgba(220, 38, 38, 0.35)",
                        color: "#ba120a",
                    }}
                >
                    {resultado?.mensagemErro}
                </div>
            ) : (
                <>
                {resolucao && dum && usDate && (parseInt(usSemanas) > 0 || parseInt(usDias) > 0) && (
                    <div className="gest-dating-card" style={{ marginTop: "20px" }}>
                        <div className="gest-dating-card-title">Resolução da data</div>
                        <div className="gest-dating-row">
                            <span className="gest-dating-label">DUM informada</span>
                            <span className="gest-dating-value">{formatDateCurta(new Date(dum + "T12:00:00"))}</span>
                        </div>
                        <div className="gest-dating-row">
                            <span className="gest-dating-label">DUM pelo US</span>
                            <span className="gest-dating-value">{formatDateCurta(resolucao.dumEfetiva)}</span>
                        </div>
                        {resolucao.diffDias !== null && (
                            <div className="gest-dating-row">
                                <span className="gest-dating-label">Diferença</span>
                                <span className="gest-dating-value">{resolucao.diffDias} {resolucao.diffDias === 1 ? "dia" : "dias"}</span>
                            </div>
                        )}
                        <div className="gest-dating-row">
                            <span className="gest-dating-label">Fonte utilizada</span>
                            <span className="gest-dating-value">
                                {resolucao.fonte === "dum" ? "DUM" : "Ultrassom"}
                                <span className={`gest-dating-source gest-dating-source--${resolucao.fonte}`}>
                                    {resolucao.fonte === "dum" ? "DUM" : "US"}
                                </span>
                            </span>
                        </div>
                        <div className="gest-dating-rule">
                            {resolucao.motivo}
                        </div>
                    </div>
                )}
                <div className="gest-main" style={{ marginTop: "20px" }}>
                    {/* Card principal — IG, DPP, progresso */}
                    <div
                        className="gest-card"
                        style={{
                            background: cores.bg,
                            border: `1px solid ${cores.border}`,
                        }}
                    >
                        <div className="gest-card-header">
                            <span
                                style={{
                                    ...styles.badge,
                                    marginBottom: 0,
                                    color: cores.t,
                                    border: `1px solid ${cores.border}`,
                                }}
                            >
                                {resultado.trimestre}
                            </span>
                            <BotaoCopiar texto={textoCopia} />
                        </div>

                        <div style={styles.label}>Idade gestacional</div>
                        <div style={styles.scoreValue}>{idadeGestacional}</div>

                        <div style={styles.detailRow}>
                            <span style={styles.detailLabel}>
                                Data provável do parto
                            </span>
                            <span style={styles.detailValue}>
                                {formatDateBR(resultado.dpp)}
                            </span>
                        </div>
                        <div style={styles.detailRow}>
                            <span style={styles.detailLabel}>
                                Faltam aproximadamente
                            </span>
                            <span style={styles.detailValue}>
                                {resultado.diasRestantes}{" "}
                                {resultado.diasRestantes === 1 ? "dia" : "dias"}
                            </span>
                        </div>
                        <div
                            style={{
                                ...styles.detailRow,
                                borderBottom: "none",
                                paddingBottom: 0,
                            }}
                        >
                            <span style={styles.detailLabel}>Progresso</span>
                            <span style={styles.detailValue}>
                                {resultado.percentual}%
                            </span>
                        </div>

                        <BarraProgressoGestacional
                            percentual={resultado.percentual}
                        />

                        {resultado.mensagemErro && (
                            <div style={styles.alertBox}>
                                ⚠️ {resultado.mensagemErro}
                            </div>
                        )}
                    </div>

                    {/* Cards laterais */}
                    <div className="gest-side">
                        {/* Card tamanho do feto */}
                        <div className="gest-card">
                            <div style={styles.cardTitle}>Tamanho do bebê</div>
                            <div style={styles.emojiLarge}>
                                {resultado.tamanho.emoji}
                            </div>
                            <div style={styles.funText}>
                                <strong>
                                    Cerca do tamanho de{" "}
                                    {resultado.tamanho.comparacao}
                                </strong>
                            </div>
                            <div
                                style={{
                                    ...styles.funText,
                                    marginTop: "8px",
                                    color: "var(--gest-text-muted)",
                                }}
                            >
                                {resultado.tamanho.curiosidade}
                            </div>
                            <div style={{ marginTop: "12px" }}>
                                <div style={styles.detailRow}>
                                    <span style={styles.detailLabel}>
                                        Tamanho aproximado
                                    </span>
                                    <span style={styles.detailValue}>
                                        {resultado.medidas.tamanhoCm}
                                    </span>
                                </div>
                                <div
                                    style={{
                                        ...styles.detailRow,
                                        borderBottom: "none",
                                        paddingBottom: 0,
                                    }}
                                >
                                    <span style={styles.detailLabel}>
                                        Altura uterina esperada
                                    </span>
                                    <span style={styles.detailValue}>
                                        {" "}
                                        {resultado.medidas.alturaUterina} cm
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Card marcos da fase */}
                        <div className="gest-card">
                            <div style={styles.cardTitle}>
                                Marcos desta fase
                            </div>
                            {resultado.marcos.agora.length === 0 &&
                            resultado.marcos.emBreve.length === 0 ? (
                                <div
                                    style={{
                                        fontSize: "13px",
                                        color: "var(--gest-text-muted)",
                                        lineHeight: 1.5,
                                    }}
                                >
                                    Nenhum marco específico nesta semana.
                                    Continue o acompanhamento pré-natal regular.
                                </div>
                            ) : (
                                <div className="gest-milestones">
                                    {resultado.marcos.agora.map((m) => (
                                        <CardMarco
                                            key={`agora-${m.semana}-${m.titulo}`}
                                            marco={m}
                                            tipo="now"
                                        />
                                    ))}
                                    {resultado.marcos.emBreve.map((m) => (
                                        <CardMarco
                                            key={`breve-${m.semana}-${m.titulo}`}
                                            marco={m}
                                            tipo="soon"
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Rotina MS: consultas, exames e suplementação */}
                <RotinaPreNatal
                    dum={resultado.dum}
                    semanas={resultado.semanas}
                />
                </>
            )}
            </>
            ) : (
            <>
            <div style={styles.title}>Risco gestacional</div>
            <div style={styles.subtitle}>
                estratificação de risco segundo o Ministério da Saúde
            </div>

            <div className="gest-risk">
                <div className="gest-risk-corpo">
                    <div className="gest-risk-grupos">
                        {RISCOS_MS.map(grupo => (
                            <BlocoRisco
                                key={grupo.id}
                                grupo={grupo}
                                marcados={riscoMarcados}
                                aoMarcar={toggleRiscoFator}
                            />
                        ))}
                    </div>

                    <div className="gest-risk-side">
                        {riscoResultado.fatores.length > 0 ? (
                            <div className={`gest-card gest-risk-resultado gest-risk-resultado--${riscoResultado.nivel}`}>
                                <div style={styles.cardTitle}>Estratificação de risco</div>
                                <div className={`gest-risk-score gest-risk-score--${riscoResultado.nivel}`}>
                                    {LABEL_NIVEL_RISCO[riscoResultado.nivel]}
                                </div>
                                <div className="gest-risk-conduta">
                                    {CONDUTA_RISCO[riscoResultado.nivel]}
                                </div>
                                <div className="gest-risk-fatores">
                                    {riscoResultado.fatores.map(f => (
                                        <div className="gest-risk-fator" key={f}>
                                            {f}
                                        </div>
                                    ))}
                                </div>
                                {riscoResultado.temAlarme && (
                                    <div className="gest-risk-callout">
                                        <strong>Sinais de alarme presentes</strong> — avaliar em
                                        urgência/emergência obstétrica (encaminhamento hospitalar).
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div style={styles.empty}>
                                Selecione os fatores de risco aplicáveis para
                                estratificar o risco.
                            </div>
                        )}
                    </div>
                </div>

                <div className="gest-routine-source">
                    Fonte: Ministério da Saúde — Manual de Gestação de Alto Risco (2022) e
                    Manual de Atenção ao Pré-Natal de Baixo Risco (2012). Reclassificar o risco
                    a cada consulta e revisar diante de novos sinais.
                </div>
            </div>
            </>
            )}
        </div>
    )
})

