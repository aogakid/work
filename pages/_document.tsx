import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <meta name="theme-color" content="#FFF9EB" />
        <meta name="theme-color" media="(prefers-color-scheme: dark)" content="#221F1C" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link 
          href="https://fonts.googleapis.com/css2?family=Google+Sans+Flex:opsz,wght@6..144,1..1000&display=swap" 
          rel="stylesheet" 
        />
        <link rel="icon" type="image/png" href="/favicon-96x96.png" sizes="96x96" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-title" content="Aogawork" />
        <link rel="manifest" href="/site.webmanifest" />
        <style>{`
          html, body {
            background-color: #FFF9EB !important;
            margin: 0;
            padding: 0;
          }
          @media (prefers-color-scheme: dark) {
            html, body {
              background-color: #221F1C !important;
            }
          }
          ::view-transition-old(root) {
            animation: 300ms ease-in both slide-out-up;
            opacity: 1 !important;
          }

          ::view-transition-new(root) {
            animation: 300ms ease-out both slide-in-up;
          }

          @keyframes slide-out-up {
            from { transform: translateY(0); }
            to { transform: translateY(-100%); }
          }

          @keyframes slide-in-up {
            from { transform: translateY(100%); }
            to { transform: translateY(0); }
          }
        `}</style>
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
