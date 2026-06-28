import type { AppProps } from "next/app";
import { useRouter } from "next/router";
import { useEffect } from "react";

export default function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();

  useEffect(() => {
    const originalPush = router.push.bind(router);

    (router as any).push = (...args: any[]) => {
      if (!document.startViewTransition) {
        return originalPush(...args);
      }

      return new Promise((resolve) => {
        document.startViewTransition(async () => {
          const result = await originalPush(...args);
          resolve(result);
        });
      });
    };

    return () => {
      (router as any).push = originalPush;
    };
  }, [router]);

  return <Component {...pageProps} />;
}