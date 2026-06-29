const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { EventEmitter } = require('events');
const { db, botDir } = require('../db');

const MAX_LOG_LINES = 500;
const processes = new Map(); // botId -> { proc, startedAt }
const logEmitter = new EventEmitter();
logEmitter.setMaxListeners(0);

function logFilePath(userId, botId) {
  return path.join(botDir(userId, botId), 'run.log');
}

function appendLog(userId, botId, line) {
  const file = logFilePath(userId, botId);
  try {
    fs.appendFileSync(file, line + '\n');
    // Trim file if it grows too large, keep last ~MAX_LOG_LINES*2 lines on disk
    const content = fs.readFileSync(file, 'utf8').split('\n');
    if (content.length > MAX_LOG_LINES * 2) {
      fs.writeFileSync(file, content.slice(-MAX_LOG_LINES).join('\n'));
    }
  } catch (err) {
    // best-effort logging only
  }
  logEmitter.emit(`log:${botId}`, line);
}

function readRecentLogs(userId, botId) {
  const file = logFilePath(userId, botId);
  try {
    const content = fs.readFileSync(file, 'utf8').split('\n').filter(Boolean);
    return content.slice(-MAX_LOG_LINES);
  } catch (err) {
    return [];
  }
}

function isRunning(botId) {
  return processes.has(botId);
}

function startBot(bot, decryptedToken) {
  if (processes.has(bot.id)) {
    return { ok: false, error: 'Bot is already running.' };
  }

  const dir = botDir(bot.userId, bot.id);
  const scriptPath = path.join(dir, bot.entryFile || 'main.py');

  if (!fs.existsSync(scriptPath)) {
    return { ok: false, error: 'Bot script file is missing. Re-upload your .py file.' };
  }

  const env = { ...process.env };
  if (decryptedToken) env.BOT_TOKEN = decryptedToken;

  let proc;
  try {
    proc = spawn('python3', ['-u', scriptPath], {
      cwd: dir,
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (err) {
    return { ok: false, error: 'Could not start the bot process on this server.' };
  }

  processes.set(bot.id, { proc, startedAt: Date.now() });
  appendLog(bot.userId, bot.id, `[system] Starting ${bot.entryFile || 'main.py'} ...`);

  proc.stdout.on('data', (chunk) => {
    chunk.toString('utf8').split('\n').filter(Boolean).forEach((l) => appendLog(bot.userId, bot.id, l));
  });
  proc.stderr.on('data', (chunk) => {
    chunk.toString('utf8').split('\n').filter(Boolean).forEach((l) => appendLog(bot.userId, bot.id, `[err] ${l}`));
  });

  proc.on('exit', (code, signal) => {
    processes.delete(bot.id);
    appendLog(bot.userId, bot.id, `[system] Process exited (code ${code ?? 'null'}${signal ? `, signal ${signal}` : ''})`);
    db.get('bots').find({ id: bot.id }).assign({ status: 'stopped', lastStoppedAt: Date.now() }).write();
    logEmitter.emit(`status:${bot.id}`, 'stopped');
  });

  proc.on('error', (err) => {
    processes.delete(bot.id);
    appendLog(bot.userId, bot.id, `[system] Failed to launch: ${err.message}`);
    db.get('bots').find({ id: bot.id }).assign({ status: 'stopped' }).write();
    logEmitter.emit(`status:${bot.id}`, 'stopped');
  });

  db.get('bots').find({ id: bot.id }).assign({ status: 'running', lastStartedAt: Date.now() }).write();
  logEmitter.emit(`status:${bot.id}`, 'running');
  return { ok: true };
}

function stopBot(botId) {
  const entry = processes.get(botId);
  if (!entry) return { ok: false, error: 'Bot is not running.' };
  try {
    entry.proc.kill('SIGTERM');
    // Hard-kill if it ignores SIGTERM
    setTimeout(() => {
      if (processes.has(botId)) {
        try { entry.proc.kill('SIGKILL'); } catch (e) {}
      }
    }, 4000);
  } catch (err) {
    return { ok: false, error: 'Could not stop the process.' };
  }
  return { ok: true };
}

function stopAllForShutdown() {
  for (const [, entry] of processes) {
    try { entry.proc.kill('SIGTERM'); } catch (e) {}
  }
}

module.exports = {
  startBot,
  stopBot,
  isRunning,
  appendLog,
  readRecentLogs,
  logEmitter,
  stopAllForShutdown,
};
