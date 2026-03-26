/* global AsyncIterable */
import { requestUrl, RequestUrlParam } from "obsidian";

export const obsidianHttpClient = {
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

        const params: RequestUrlParam = {
            url,
            method: method || 'GET',
            headers: cleanHeaders,
            body: requestBody,
            throw: false // Don't throw on 4xx/5xx, return the response object
        };

        const response = await requestUrl(params);

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
