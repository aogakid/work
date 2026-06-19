import * as React from "react";
import {
  PlasmicComponent,
  extractPlasmicQueryData,
  ComponentRenderData,
  PlasmicRootProvider,
} from "@plasmicapp/loader-nextjs";
import type { GetServerSideProps } from "next"; 

import Error from "next/error";
import { useRouter } from "next/router";
import { PLASMIC } from "@/plasmic-init";

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

  console.log("Is System Dark Mode?", isDarkMode);
  
  return (
  <PlasmicRootProvider
    loader={PLASMIC}
    prefetchedData={plasmicData}
    prefetchedQueryData={queryCache}
    pageRoute={pageMeta.path}
    pageParams={pageMeta.params}
    pageQuery={router.query}
  >
    <PlasmicComponent 
      component={pageMeta.displayName} 
      // 👇 THIS FORCES PLASMIC TO RE-RENDER IMMEDIATELY WHEN THEME FLIPS
      key={isDarkMode ? "dark-mode" : "light-mode"} 
      componentProps={{
        globalVariants: [
          {
            name: "Mode",
            value: isDarkMode ? "Dark" : undefined,
          }
        ]
      }}
    />
  </PlasmicRootProvider>
);
}

export const getServerSideProps: GetServerSideProps = async (context) => {
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
  
  return { props: { plasmicData, queryCache } };
}
