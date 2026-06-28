import type { AppProps } from "next/app";
import { useRouter } from "next/router";
import { useEffect } from "react";

export default function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest("[href]") as HTMLAnchorElement | null;
      if (!link?.href) return;

      let url: URL;
      try {
        url = new URL(link.href);
      } catch {
        return;
      }

      if (url.origin !== location.origin) return;
      if (url.pathname === location.pathname) return;
      if (!document.startViewTransition) return;

      e.preventDefault();
      e.stopPropagation();

      document.startViewTransition(async () => {
        await router.push(url.pathname);
      });
    };

    document.addEventListener("click", handleClick, true); // capture phase
    return () => document.removeEventListener("click", handleClick, true);
  }, [router]);

  return <Component {...pageProps} />;
}