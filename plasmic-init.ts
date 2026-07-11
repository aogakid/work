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
import CalculadoraVisita from "./components/ui/visita_ui";
import PuericulturaUI from "./components/ui/puericultura_ui";
import ExamesUI from "./components/ui/exames_ui";

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
  refActions: {
    enviarParaPlanilha: {
      description: "Send content to Google Sheets",
      argTypes: [],
    },
  },
});

PLASMIC.registerComponent(FormularioInput, {
  name: "FormularioInput",
  props: {},
  refActions: {
    colarNoInput: {
      description: "Paste content from clipboard to input",
      argTypes: [],
    },
    executarPrompt: {
      description: "Execute the arrumador prompt",
      argTypes: [],
    },
  },
});

PLASMIC.registerComponent(FormularioOutput, {
  name: "FormularioOutput",
  props: {},
  refActions: {
    executarPrompt: {
      description: "Execute the arrumador prompt",
      argTypes: [],
    },
    copiarOutput: {
      description: "Copy output to clipboard",
      argTypes: [],
    },
    colarNoInput: {
      description: "Paste content from clipboard to input",
      argTypes: [],
    },
    limparTudo: {
      description: "Clear input and output",
      argTypes: [],
    },
  },
});

PLASMIC.registerComponent(Bloco, {
  name: "Bloco",
  props: {},
  refActions: {
    copiar: {
      description: "Copy editor content to clipboard",
      argTypes: [],
    },
    colar: {
      description: "Paste content from clipboard to editor",
      argTypes: [],
    },
    substituir: {
      description: "Replace editor content with specified text",
      argTypes: [{ name: "texto", type: "string" }],
    },
    limpar: {
      description: "Clear editor content",
      argTypes: [],
    },
    cronometro: {
      description: "Activate timer",
      argTypes: [],
    },
  },
});

PLASMIC.registerComponent(EncaminhaEspecialidade, {
  name: "EncaminhaEspecialidade",
  props: {},
  refActions: {
    executarEncaminhamento: {
      description: "Execute the encaminhamento",
      argTypes: [],
    },
  },
});

PLASMIC.registerComponent(EncaminhaInput, {
  name: "EncaminhaInput",
  props: {},
  refActions: {
    colarNoInput: {
      description: "Paste content from clipboard to input",
      argTypes: [],
    },
    executarEncaminhamento: {
      description: "Execute the encaminhamento",
      argTypes: [],
    },
  },
});

PLASMIC.registerComponent(EncaminhaOutput, {
  name: "EncaminhaOutput",
  props: {},
  refActions: {
    executarEncaminhamento: {
      description: "Execute the encaminhamento",
      argTypes: [],
    },
    copiarOutput: {
      description: "Copy output to clipboard",
      argTypes: [],
    },
    limparTudo: {
      description: "Clear input and output",
      argTypes: [],
    },
  },
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

PLASMIC.registerComponent(CalculadoraVisita, {
  name: "CalculadoraVisita",
  props: {},
});

PLASMIC.registerComponent(PuericulturaUI, {
  name: "PuericulturaUI",
  props: {},
});

PLASMIC.registerComponent(ExamesUI, {
  name: "ExamesUI",
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
