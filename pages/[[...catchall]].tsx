import * as React from "react";
import {
  PlasmicComponent,
  extractPlasmicQueryData,
  ComponentRenderData,
  PlasmicRootProvider,
} from "@plasmicapp/loader-nextjs";
import type { GetStaticPaths, GetStaticProps } from "next";

import Error from "next/error";
import { useRouter } from "next/router";
import { PLASMIC } from "@/plasmic-init";
import { AllProviders, useEditor, useApp, useEncaminha, useTimer, useGoogleSheets } from "@/components/contexts/AppContext";
import type { EditorApi, AppApi, EncaminhaApi, TimerApi, GoogleSheetsApi } from "@/components/contexts/AppContext";

function PlasmicApiWrapper({ children }: { children: React.ReactNode }) {
  const editor = useEditor()
  const app = useApp()
  const enc = useEncaminha()
  const timer = useTimer()
  const sheets = useGoogleSheets()

  React.useEffect(() => {
    ;(window as unknown as { framerBloco?: EditorApi }).framerBloco = editor
    ;(window as unknown as { framerApp?: AppApi }).framerApp = app
    ;(window as unknown as { framerEncaminha?: EncaminhaApi }).framerEncaminha = enc
    ;(window as unknown as { framerTimer?: TimerApi }).framerTimer = timer
    ;(window as unknown as { framerGoogleSheets?: GoogleSheetsApi }).framerGoogleSheets = sheets

    return () => {
      delete (window as unknown as { framerBloco?: EditorApi }).framerBloco
      delete (window as unknown as { framerApp?: AppApi }).framerApp
      delete (window as unknown as { framerEncaminha?: EncaminhaApi }).framerEncaminha
      delete (window as unknown as { framerTimer?: TimerApi }).framerTimer
      delete (window as unknown as { framerGoogleSheets?: GoogleSheetsApi }).framerGoogleSheets
    }
  }, [editor, app, enc, timer, sheets])

  return <>{children}</>
}

export default function PlasmicLoaderPage(props: {
  plasmicData?: ComponentRenderData;
  queryCache?: Record<string, unknown>;
}) {
  const { plasmicData, queryCache } = props;
  const router = useRouter();

  const [isDarkMode, setIsDarkMode] = React.useState(false);

  React.useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setIsDarkMode(mediaQuery.matches);

    const listener = (e: MediaQueryListEvent) => setIsDarkMode(e.matches);
    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, []);

  if (!plasmicData || plasmicData.entryCompMetas.length === 0) {
    return <Error statusCode={404} />;
  }
  const pageMeta = plasmicData.entryCompMetas[0];

  return (
  <AllProviders>
    <PlasmicApiWrapper>
      <PlasmicRootProvider
        loader={PLASMIC}
        prefetchedData={plasmicData}
        prefetchedQueryData={queryCache}
        pageRoute={pageMeta.path}
        pageParams={pageMeta.params}
        pageQuery={router.query}
        globalVariants={isDarkMode ? [{ name: "Mode", value: "dark" }] : []}
      >
        <PlasmicComponent component={pageMeta.displayName} />
      </PlasmicRootProvider>
    </PlasmicApiWrapper>
  </AllProviders>
);
}

// Attach APIs to window outside React for Plasmic access
if (typeof window !== 'undefined') {
  (window as any).framerBloco = { copiar: () => {}, colar: () => {}, substituir: () => {} }
  (window as any).framerApp = { colarNoInput: () => {}, executarPrompt: () => {}, copiarOutput: () => {}, limparTudo: () => {} }
  (window as any).framerEncaminha = { colarNoInput: () => {}, executarEncaminhamento: () => {}, copiarOutput: () => {}, limparTudo: () => {} }
  (window as any).framerTimer = { ativarCronometro: () => {} }
  (window as any).framerGoogleSheets = { enviarParaPlanilha: () => {} }
}

export const getStaticProps: GetStaticProps = async (context) => {
  const { catchall } = context.params ?? {};
  const plasmicPath = typeof catchall === 'string' ? catchall : Array.isArray(catchall) ? `/${catchall.join('/')}` : '/';
  const plasmicData = await PLASMIC.maybeFetchComponentData(plasmicPath);
  if (!plasmicData) {
    return { props: {} };
  }
  const pageMeta = plasmicData.entryCompMetas[0];
  
  const queryCache = await extractPlasmicQueryData(
    <PlasmicRootProvider
      loader={PLASMIC}
      prefetchedData={plasmicData}
      pageRoute={pageMeta.path}
      pageParams={pageMeta.params}
    >
      <PlasmicComponent component={pageMeta.displayName} />
    </PlasmicRootProvider>
  );
  
  return { props: { plasmicData, queryCache }, revalidate: 60 };
}

export const getStaticPaths: GetStaticPaths = async () => {
  const pageModules = await PLASMIC.fetchPages();
  return {
    paths: pageModules.map((mod) => ({
      params: {
        catchall: mod.path.substring(1).split("/"),
      },
    })),
    fallback: true,
  };
}
