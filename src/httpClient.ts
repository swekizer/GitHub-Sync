/* global AsyncIterable */
import { requestUrl, RequestUrlParam, Platform } from "obsidian";

export const obsidianHttpClient = {
    async request(params: { url: string, method?: string, headers?: Record<string, string>, body?: Iterable<Uint8Array> | AsyncIterable<Uint8Array> }) {
        // Use Node's streaming HTTP client on Desktop to avoid memory exhaustion (OOM crashes) on large repositories.
        // We must use Obsidian's requestUrl on mobile to bypass CORS, even though it buffers entirely in memory.
        if (Platform.isDesktop) {
            try {
                // Using dynamic import prevents esbuild from crashing the mobile plugin load
                // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
                const nodeHttp = (await import('isomorphic-git/http/node')) as any;
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
                const httpClient = nodeHttp.default || nodeHttp;
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return
                return await httpClient.request(params);
            } catch (e) {
                console.warn('Failed to load Node HTTP client, falling back to Obsidian requestUrl buffer', e);
            }
        }
        
        return await bufferedHttpClient.request(params);
    }
};

const bufferedHttpClient = {
    async request({ url, method, headers, body }: { url: string, method?: string, headers?: Record<string, string>, body?: Iterable<Uint8Array> | AsyncIterable<Uint8Array> }) {
        let requestBody: ArrayBuffer | undefined = undefined;
        
        if (body) {
            const chunks: Uint8Array[] = [];
            let totalLength = 0;
            
            // body is an AsyncIterable or Iterable
            for await (const chunk of body) {
                chunks.push(chunk);
                totalLength += chunk.length;
            }
            
            const combined = new Uint8Array(totalLength);
            let offset = 0;
            for (const chunk of chunks) {
                combined.set(chunk, offset);
                offset += chunk.length;
            }
            requestBody = combined.buffer;
        }

        // Clean headers, Obsidian requestUrl sometimes rejects certain headers or needs them properly cased
        const cleanHeaders: Record<string, string> = {};
        if (headers) {
            for (const key of Object.keys(headers)) {
                if (headers[key]) {
                    cleanHeaders[key] = headers[key];
                }
            }
        }

        const paramsToPass: RequestUrlParam = {
            url,
            method: method || 'GET',
            headers: cleanHeaders,
            body: requestBody,
            throw: false // Don't throw on 4xx/5xx, return the response object
        };

        const response = await requestUrl(paramsToPass);

        return {
            url,
            method,
            headers: response.headers,
            body: (async function* () {
                if (response.arrayBuffer) {
                    await Promise.resolve(); // fix for: Async generator function has no 'await' expression
                    yield new Uint8Array(response.arrayBuffer);
                }
            })(),
            statusCode: response.status,
            statusMessage: response.status.toString()
        };
    }
};
