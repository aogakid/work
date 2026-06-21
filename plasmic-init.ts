import { initPlasmicLoader } from "@plasmicapp/loader-nextjs";

// UI components
import GoogleSheetsInput from "./components/ui/agenda_ui";
import FormularioInput from "./components/ui/arrumador_ui_entrada";
import FormularioOutput from "./components/ui/arrumador_ui_saida";
import Bloco from "./components/ui/bloco_ui";
import EncaminhaEspecialidade from "./components/ui/encaminhador_ui_entrada_especialidade";
import EncaminhaInput from "./components/ui/encaminhador_ui_entrada_prontuario";
import EncaminhaOutput from "./components/ui/encaminhador_ui_saida";
import CalculadoraPREVENT from "./components/ui/escores_ui";
import CalculadoraGestacional from "./components/ui/prenatal_ui";
import RastreiosPreventivos from "./components/ui/rastreios_ui";
import { PlasmicApiHelper, PlasmicTrigger } from "./components/ui/plasmic_helpers";

// Action HOCs (code overrides)
import {
  withGoogleSheetsSubmit,
  withGoogleSheetsPaste,
} from "./components/actions/agenda_acoes";
import {
  comBotaoDisparar,
  comBotaoCopiar as comBotaoCopiarArrumador,
  comBotaoLimpar,
  comBotaoColar as comBotaoColarArrumador,
} from "./components/actions/arrumador_acoes";
import { comTriggerCronometro } from "./components/actions/bloco_cronometro";
import {
  comBotaoCopiar as comBotaoCopiarEditor,
  comBotaoColar as comBotaoColarEditor,
  SubstituirConsultaAgendada,
  comSubstituirDemandaEspontanea,
  comSubstituirPreNatal,
  comBotaoLimparEditor,
} from "./components/actions/bloco_editor";
import {
  comBotaoGerar,
  comBotaoColarEncaminha,
  comBotaoCopiarEncaminha,
  comBotaoLimparEncaminha,
} from "./components/actions/encaminhador_acoes";

export const PLASMIC = initPlasmicLoader({
  projects: [
    {
      id: "34iiJXfbpwhozM9QTesRHm",
      token: "dlci6cKZQgQmkLVdTVNfZcfxjyltgMHbSdZQDwhXOJGfBHAMldFq6cZi4deePl8tl2PF8fYxJxDlRTOhSW0g",
    },
  ],
  preview: false,
});

// ---------------------------------------------------------------------------
// UI Components
// ---------------------------------------------------------------------------

PLASMIC.registerComponent(GoogleSheetsInput, {
  name: "GoogleSheetsInput",
  props: {},
});

PLASMIC.registerComponent(FormularioInput, {
  name: "FormularioInput",
  props: {},
});

PLASMIC.registerComponent(FormularioOutput, {
  name: "FormularioOutput",
  props: {},
});

PLASMIC.registerComponent(Bloco, {
  name: "Bloco",
  props: {},
});

PLASMIC.registerComponent(EncaminhaEspecialidade, {
  name: "EncaminhaEspecialidade",
  props: {},
});

PLASMIC.registerComponent(EncaminhaInput, {
  name: "EncaminhaInput",
  props: {},
});

PLASMIC.registerComponent(EncaminhaOutput, {
  name: "EncaminhaOutput",
  props: {},
});

PLASMIC.registerComponent(CalculadoraPREVENT, {
  name: "CalculadoraPREVENT",
  props: {},
});

PLASMIC.registerComponent(CalculadoraGestacional, {
  name: "CalculadoraGestacional",
  props: {},
});

PLASMIC.registerComponent(RastreiosPreventivos, {
  name: "RastreiosPreventivos",
  props: {},
});

PLASMIC.registerComponent(PlasmicApiHelper, {
  name: "PlasmicApiHelper",
  props: {},
});

PLASMIC.registerComponent(PlasmicTrigger, {
  name: "PlasmicTrigger",
  props: {},
});

// ---------------------------------------------------------------------------
// Action HOCs (code overrides)
// ---------------------------------------------------------------------------

// Agenda
export {
  withGoogleSheetsSubmit,
  withGoogleSheetsPaste,
};

// Arrumador
export {
  comBotaoDisparar,
  comBotaoCopiarArrumador,
  comBotaoLimpar,
  comBotaoColarArrumador,
};

// Bloco Editor
export {
  comBotaoCopiarEditor,
  comBotaoColarEditor,
  SubstituirConsultaAgendada,
  comSubstituirDemandaEspontanea,
  comSubstituirPreNatal,
  comBotaoLimparEditor,
};

// Bloco Cronômetro
export { comTriggerCronometro };

// Encaminhador
export {
  comBotaoGerar,
  comBotaoColarEncaminha,
  comBotaoCopiarEncaminha,
  comBotaoLimparEncaminha,
};

// ---------------------------------------------------------------------------
// Global API for Plasmic run code
// ---------------------------------------------------------------------------

// These functions will be available in Plasmic's "run code" context
declare global {
  interface Window {
    framerBloco?: { copiar: () => void; colar: () => void; substituir: (texto: string) => void };
    framerApp?: { colarNoInput: () => void; executarPrompt: () => void; copiarOutput: () => void; limparTudo: () => void };
    framerEncaminha?: { colarNoInput: () => void; executarEncaminhamento: () => void; copiarOutput: () => void; limparTudo: () => void };
    framerTimer?: { ativarCronometro: () => void };
    framerGoogleSheets?: { enviarParaPlanilha: () => void };
  }
}

// Export for Plasmic to access
export const plasmicGlobalApi = {
  framerBloco: () => (typeof window !== 'undefined' ? window.framerBloco : null),
  framerApp: () => (typeof window !== 'undefined' ? window.framerApp : null),
  framerEncaminha: () => (typeof window !== 'undefined' ? window.framerEncaminha : null),
  framerTimer: () => (typeof window !== 'undefined' ? window.framerTimer : null),
  framerGoogleSheets: () => (typeof window !== 'undefined' ? window.framerGoogleSheets : null),
};
