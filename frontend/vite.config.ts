import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { ProxyOptions } from "vite";

export default ({ mode }: { mode: string }) => {
  const env = loadEnv(mode, process.cwd(), "") as Record<
    string,
    string | undefined
  >;

  return defineConfig({
    plugins: [react()],
    server: {
      host: env.FRONTEND_HOST,
      proxy: {
        "/backend": {
          target: env.VITE_BACKEND_BASE_URL,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/backend/, ""),
          secure: false,
          ws: true,
          cookieDomainRewrite: env.FRONTEND_HOST,
          configure: (proxy, _options) => {
            proxy.on("proxyRes", (proxyRes) => {
              let setCookieHeader = proxyRes.headers["set-cookie"];
              if (setCookieHeader) {
                setCookieHeader = setCookieHeader.map((cookie) =>
                  cookie
                    .replace(/;?\s*SameSite=[^;]+/, "")
                    .replace(/;?\s*Secure/, ""),
                );
                proxyRes.headers["set-cookie"] = setCookieHeader;
              }
            });
          },
        } as ProxyOptions,
      },
    },
  });
};
