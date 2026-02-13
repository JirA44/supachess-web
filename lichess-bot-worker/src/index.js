/**
 * SupaChess Lichess BOT Worker
 * Cloudflare Worker for connecting SupaChess engine to Lichess BOT API
 *
 * Features:
 * - NDJSON streaming for Lichess events
 * - OAuth2 token management
 * - Game state handling
 * - Move routing to SupaChess engine
 */

const LICHESS_API = 'https://lichess.org/api';

// KV namespace binding for token storage (configure in wrangler.toml)
// @ts-ignore
const KV = typeof LICHESS_TOKENS !== 'undefined' ? LICHESS_TOKENS : null;

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const path = url.pathname;

        // CORS headers
        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        };

        if (request.method === 'OPTIONS') {
            return new Response(null, { headers: corsHeaders });
        }

        try {
            // Route handlers
            if (path === '/') {
                return jsonResponse({
                    service: 'SupaChess Lichess BOT',
                    version: '1.0.0',
                    endpoints: ['/health', '/lichess/auth', '/lichess/stream', '/lichess/move/:gameId', '/lichess/challenge']
                }, corsHeaders);
            }

            if (path === '/health') {
                return jsonResponse({ status: 'healthy', timestamp: Date.now() }, corsHeaders);
            }

            if (path === '/lichess/auth' && request.method === 'POST') {
                return handleAuth(request, env, corsHeaders);
            }

            if (path === '/lichess/stream') {
                return handleStream(request, env, ctx, corsHeaders);
            }

            if (path.startsWith('/lichess/move/')) {
                const gameId = path.split('/').pop();
                return handleMove(request, env, gameId, corsHeaders);
            }

            if (path === '/lichess/challenge' && request.method === 'POST') {
                return handleChallenge(request, env, corsHeaders);
            }

            if (path === '/lichess/account') {
                return handleAccount(env, corsHeaders);
            }

            return jsonResponse({ error: 'Not found' }, corsHeaders, 404);
        } catch (error) {
            console.error('Worker error:', error);
            return jsonResponse({ error: error.message }, corsHeaders, 500);
        }
    }
};

function jsonResponse(data, corsHeaders, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
}

/**
 * Store OAuth2 token
 * POST /lichess/auth
 * Body: { token: "lip_xxxxx" }
 */
async function handleAuth(request, env, corsHeaders) {
    const { token } = await request.json();

    if (!token || !token.startsWith('lip_')) {
        return jsonResponse({ error: 'Invalid token format. Must start with lip_' }, corsHeaders, 400);
    }

    // Verify token with Lichess
    const verifyResp = await fetch(`${LICHESS_API}/account`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!verifyResp.ok) {
        return jsonResponse({ error: 'Token verification failed' }, corsHeaders, 401);
    }

    const account = await verifyResp.json();

    // Check BOT account
    if (!account.title || account.title !== 'BOT') {
        return jsonResponse({
            error: 'Account is not a BOT account. Upgrade at lichess.org/account/bot',
            account: account.username
        }, corsHeaders, 400);
    }

    // Store in KV or memory
    if (env.LICHESS_TOKENS) {
        await env.LICHESS_TOKENS.put('bot_token', token);
        await env.LICHESS_TOKENS.put('bot_username', account.username);
    }

    return jsonResponse({
        success: true,
        username: account.username,
        title: account.title
    }, corsHeaders);
}

/**
 * Get account info
 * GET /lichess/account
 */
async function handleAccount(env, corsHeaders) {
    const token = env.LICHESS_TOKENS ? await env.LICHESS_TOKENS.get('bot_token') : null;

    if (!token) {
        return jsonResponse({ error: 'No token configured' }, corsHeaders, 401);
    }

    const resp = await fetch(`${LICHESS_API}/account`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!resp.ok) {
        return jsonResponse({ error: 'Failed to fetch account' }, corsHeaders, resp.status);
    }

    const account = await resp.json();
    return jsonResponse(account, corsHeaders);
}

/**
 * Stream Lichess events (challenges, game starts)
 * GET /lichess/stream
 * Returns NDJSON stream
 */
async function handleStream(request, env, ctx, corsHeaders) {
    const token = env.LICHESS_TOKENS ? await env.LICHESS_TOKENS.get('bot_token') : null;

    if (!token) {
        return jsonResponse({ error: 'No token configured' }, corsHeaders, 401);
    }

    // Create a TransformStream to process NDJSON
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();

    // Start streaming in background
    ctx.waitUntil((async () => {
        try {
            const resp = await fetch(`${LICHESS_API}/stream/event`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!resp.ok) {
                await writer.write(encoder.encode(JSON.stringify({ error: 'Stream failed' }) + '\n'));
                await writer.close();
                return;
            }

            const reader = resp.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (line.trim()) {
                        try {
                            const event = JSON.parse(line);
                            // Process event
                            const processed = await processLichessEvent(event, token, env);
                            await writer.write(encoder.encode(JSON.stringify(processed) + '\n'));
                        } catch (e) {
                            // Keep-alive or invalid JSON
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Stream error:', error);
        } finally {
            await writer.close();
        }
    })());

    return new Response(readable, {
        headers: {
            ...corsHeaders,
            'Content-Type': 'application/x-ndjson',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
        }
    });
}

/**
 * Process Lichess event and respond appropriately
 */
async function processLichessEvent(event, token, env) {
    console.log('Lichess event:', event.type);

    switch (event.type) {
        case 'challenge':
            // Auto-accept challenges matching our criteria
            const challenge = event.challenge;
            if (shouldAcceptChallenge(challenge)) {
                await acceptChallenge(challenge.id, token);
                return { type: 'challenge_accepted', id: challenge.id };
            } else {
                await declineChallenge(challenge.id, token, 'generic');
                return { type: 'challenge_declined', id: challenge.id };
            }

        case 'gameStart':
            // Start playing the game
            return {
                type: 'game_started',
                gameId: event.game.gameId,
                color: event.game.color,
                opponent: event.game.opponent
            };

        case 'gameFinish':
            return {
                type: 'game_finished',
                gameId: event.game.gameId
            };

        default:
            return event;
    }
}

/**
 * Determine if we should accept a challenge
 */
function shouldAcceptChallenge(challenge) {
    // Accept standard chess only
    if (challenge.variant.key !== 'standard') return false;

    // Accept bullet, blitz, rapid
    const validSpeeds = ['bullet', 'blitz', 'rapid'];
    if (!validSpeeds.includes(challenge.speed)) return false;

    // Accept rated or casual
    return true;
}

async function acceptChallenge(challengeId, token) {
    await fetch(`${LICHESS_API}/challenge/${challengeId}/accept`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
    });
}

async function declineChallenge(challengeId, token, reason) {
    await fetch(`${LICHESS_API}/challenge/${challengeId}/decline`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: `reason=${reason}`
    });
}

/**
 * Make a move in a game
 * POST /lichess/move/:gameId
 * Body: { move: "e2e4" } or { fen: "...", engineLevel: 8 }
 */
async function handleMove(request, env, gameId, corsHeaders) {
    const token = env.LICHESS_TOKENS ? await env.LICHESS_TOKENS.get('bot_token') : null;

    if (!token) {
        return jsonResponse({ error: 'No token configured' }, corsHeaders, 401);
    }

    const body = await request.json();
    let move = body.move;

    // If FEN provided, calculate move from engine
    if (body.fen && !move) {
        move = await calculateEngineMove(body.fen, body.engineLevel || 8, env);
    }

    if (!move) {
        return jsonResponse({ error: 'No move provided or calculated' }, corsHeaders, 400);
    }

    // Send move to Lichess
    const resp = await fetch(`${LICHESS_API}/bot/game/${gameId}/move/${move}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!resp.ok) {
        const error = await resp.text();
        return jsonResponse({ error: `Move failed: ${error}` }, corsHeaders, resp.status);
    }

    return jsonResponse({ success: true, move, gameId }, corsHeaders);
}

/**
 * Calculate engine move using SupaChess engine
 * This connects to the local/cloud engine server
 */
async function calculateEngineMove(fen, level, env) {
    // Try SupaChess engine API first
    const engineUrls = [
        env.ENGINE_URL || 'https://aimix-engine-server.onrender.com',
        'http://localhost:3001'
    ];

    for (const baseUrl of engineUrls) {
        try {
            const resp = await fetch(`${baseUrl}/analyze`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fen,
                    depth: Math.min(level * 2, 20),
                    multipv: 1
                }),
                signal: AbortSignal.timeout(5000)
            });

            if (resp.ok) {
                const result = await resp.json();
                if (result.bestMove) {
                    return result.bestMove;
                }
            }
        } catch (e) {
            console.log(`Engine ${baseUrl} unavailable:`, e.message);
        }
    }

    // Fallback: Use simple opening book or random legal move
    return getBookMove(fen) || null;
}

/**
 * Simple opening book
 */
function getBookMove(fen) {
    const openingBook = {
        'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq': 'e2e4',
        'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq': 'e7e5',
        'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq': 'g1f3',
        'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq': 'f1b5',
    };

    const boardFen = fen.split(' ').slice(0, 4).join(' ');
    for (const [bookFen, move] of Object.entries(openingBook)) {
        if (boardFen.startsWith(bookFen.split(' ')[0])) {
            return move;
        }
    }
    return null;
}

/**
 * Create a challenge
 * POST /lichess/challenge
 * Body: { username: "opponent", time: 180, increment: 0 }
 */
async function handleChallenge(request, env, corsHeaders) {
    const token = env.LICHESS_TOKENS ? await env.LICHESS_TOKENS.get('bot_token') : null;

    if (!token) {
        return jsonResponse({ error: 'No token configured' }, corsHeaders, 401);
    }

    const { username, time = 180, increment = 0, rated = false } = await request.json();

    if (!username) {
        return jsonResponse({ error: 'Username required' }, corsHeaders, 400);
    }

    const resp = await fetch(`${LICHESS_API}/challenge/${username}`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
            'clock.limit': time.toString(),
            'clock.increment': increment.toString(),
            'rated': rated.toString()
        })
    });

    if (!resp.ok) {
        const error = await resp.text();
        return jsonResponse({ error: `Challenge failed: ${error}` }, corsHeaders, resp.status);
    }

    const challenge = await resp.json();
    return jsonResponse({ success: true, challenge }, corsHeaders);
}

/**
 * Game stream handler for playing a specific game
 * This would be called from the main stream when a game starts
 */
export async function playGame(gameId, token, env) {
    const resp = await fetch(`${LICHESS_API}/bot/game/stream/${gameId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!resp.ok) {
        throw new Error(`Failed to stream game ${gameId}`);
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let gameState = null;

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
            if (!line.trim()) continue;

            try {
                const event = JSON.parse(line);

                if (event.type === 'gameFull') {
                    gameState = event;
                    // Check if it's our turn
                    if (isOurTurn(gameState)) {
                        const move = await calculateEngineMove(
                            getFenFromState(gameState),
                            8,
                            env
                        );
                        if (move) {
                            await makeMove(gameId, move, token);
                        }
                    }
                } else if (event.type === 'gameState') {
                    gameState.state = event;
                    if (isOurTurn(gameState)) {
                        const move = await calculateEngineMove(
                            getFenFromState(gameState),
                            8,
                            env
                        );
                        if (move) {
                            await makeMove(gameId, move, token);
                        }
                    }
                }
            } catch (e) {
                // Keep-alive or invalid JSON
            }
        }
    }
}

function isOurTurn(gameState) {
    if (!gameState || !gameState.state) return false;
    const moves = gameState.state.moves?.split(' ').filter(m => m) || [];
    const isWhite = gameState.white?.id === gameState.me?.id;
    const whiteTurn = moves.length % 2 === 0;
    return isWhite === whiteTurn;
}

function getFenFromState(gameState) {
    // Convert moves to FEN using chess.js logic or return initial position
    // This is a simplified version - full implementation would use chess.js
    if (!gameState.state?.moves) {
        return gameState.initialFen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    }
    // For full FEN calculation, we'd need chess.js
    return gameState.initialFen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
}

async function makeMove(gameId, move, token) {
    await fetch(`${LICHESS_API}/bot/game/${gameId}/move/${move}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
    });
}
