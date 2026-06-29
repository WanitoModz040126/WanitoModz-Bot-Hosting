var STARTER_TEMPLATES = {
  'pytelegrambotapi-sync': {
    file: 'main.py',
    code: "import os\nimport telebot\n\nBOT_TOKEN = os.environ.get('BOT_TOKEN')\nbot = telebot.TeleBot(BOT_TOKEN)\n\n@bot.message_handler(commands=['start'])\ndef start(message):\n    bot.reply_to(message, \"Hello! I'm your bot.\")\n\n@bot.message_handler(commands=['ping'])\ndef ping(message):\n    bot.reply_to(message, 'Pong!')\n\nbot.infinity_polling()\n",
  },
  'pytelegrambotapi-async': {
    file: 'main.py',
    code: "import os\nimport asyncio\nfrom telebot.async_telebot import AsyncTeleBot\n\nBOT_TOKEN = os.environ.get('BOT_TOKEN')\nbot = AsyncTeleBot(BOT_TOKEN)\n\n@bot.message_handler(commands=['start'])\nasync def start(message):\n    await bot.reply_to(message, \"Hello! I'm your bot.\")\n\nasyncio.run(bot.polling())\n",
  },
  'python-telegram-bot': {
    file: 'main.py',
    code: "import os\nfrom telegram import Update\nfrom telegram.ext import ApplicationBuilder, CommandHandler, ContextTypes\n\nBOT_TOKEN = os.environ.get('BOT_TOKEN')\n\nasync def start(update: Update, context: ContextTypes.DEFAULT_TYPE):\n    await update.message.reply_text(\"Hello! I'm your bot.\")\n\napp = ApplicationBuilder().token(BOT_TOKEN).build()\napp.add_handler(CommandHandler('start', start))\napp.run_polling()\n",
  },
  aiogram: {
    file: 'main.py',
    code: "import os\nimport asyncio\nfrom aiogram import Bot, Dispatcher, types\nfrom aiogram.filters import Command\n\nBOT_TOKEN = os.environ.get('BOT_TOKEN')\nbot = Bot(token=BOT_TOKEN)\ndp = Dispatcher()\n\n@dp.message(Command('start'))\nasync def start(message: types.Message):\n    await message.answer(\"Hello! I'm your bot.\")\n\nasync def main():\n    await dp.start_polling(bot)\n\nasyncio.run(main())\n",
  },
  pyrogram: {
    file: 'main.py',
    code: "import os\nfrom pyrogram import Client, filters\n\nBOT_TOKEN = os.environ.get('BOT_TOKEN')\napp = Client('bot', bot_token=BOT_TOKEN)\n\n@app.on_message(filters.command('start'))\ndef start(client, message):\n    message.reply('Hello! I\\'m your bot.')\n\napp.run()\n",
  },
  custom: {
    file: 'main.py',
    code: "# Upload your own bot script as-is.\n# Whatever you set as your bot token will be available as:\n#   os.environ.get('BOT_TOKEN')\n#\n# Your script just needs to keep running (e.g. a polling loop)\n# so the hosting process stays alive.\n",
  },
};

document.addEventListener('DOMContentLoaded', function () {
  var selectedLib = 'pytelegrambotapi-sync';
  var selectedFile = null;

  var previewCode = document.getElementById('previewCode');
  var previewFileName = document.getElementById('previewFileName');

  function renderPreview() {
    var t = STARTER_TEMPLATES[selectedLib];
    previewFileName.textContent = t.file;
    previewCode.textContent = t.code;
  }
  renderPreview();

  document.getElementById('copyPreviewBtn').addEventListener('click', function () {
    navigator.clipboard.writeText(previewCode.textContent).then(function () {
      showToast('Copied to clipboard.', 'success');
    });
  });

  document.querySelectorAll('.lib-card').forEach(function (card) {
    card.addEventListener('click', function () {
      document.querySelectorAll('.lib-card').forEach(function (c) { c.classList.remove('is-selected'); });
      card.classList.add('is-selected');
      selectedLib = card.dataset.lib;
      renderPreview();
    });
  });

  var dropzone = document.getElementById('dropzone');
  var fileInput = document.getElementById('fileInput');
  var dzTitle = document.getElementById('dzTitle');
  var dzSub = document.getElementById('dzSub');

  function setSelectedFile(file) {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.py')) {
      showToast('Only .py files are accepted.', 'error');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      showToast('File is larger than the 8 MB limit.', 'error');
      return;
    }
    selectedFile = file;
    dropzone.classList.add('has-file');
    dzTitle.textContent = file.name;
    dzSub.textContent = (file.size / 1024).toFixed(1) + ' KB — tap to replace';
  }

  dropzone.addEventListener('click', function () { fileInput.click(); });
  fileInput.addEventListener('change', function () { setSelectedFile(fileInput.files[0]); });
  ['dragover', 'dragenter'].forEach(function (evt) {
    dropzone.addEventListener(evt, function (e) { e.preventDefault(); dropzone.classList.add('is-drag'); });
  });
  ['dragleave', 'drop'].forEach(function (evt) {
    dropzone.addEventListener(evt, function (e) { e.preventDefault(); dropzone.classList.remove('is-drag'); });
  });
  dropzone.addEventListener('drop', function (e) {
    if (e.dataTransfer.files && e.dataTransfer.files[0]) setSelectedFile(e.dataTransfer.files[0]);
  });

  document.getElementById('createBotForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    clearAlert('alertMount');

    var name = document.getElementById('botName').value.trim();
    var token = document.getElementById('botToken').value.trim();

    if (!name) { showAlert('alertMount', 'Bot name is required.'); return; }
    if (!selectedFile) { showAlert('alertMount', 'Upload your .py file before deploying.'); return; }

    var submitBtn = document.getElementById('createBotSubmit');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Deploying…';

    var formData = new FormData();
    formData.append('name', name);
    formData.append('library', selectedLib);
    formData.append('token', token);
    formData.append('file', selectedFile);

    try {
      const data = await api('/api/bots', { method: 'POST', body: formData });
      showToast('Bot deployed successfully.', 'success');
      window.location.href = '/bots/' + data.bot.id;
    } catch (err) {
      showAlert('alertMount', err.message, 'error');
      submitBtn.disabled = false;
      submitBtn.innerHTML = 'Deploy bot';
    }
  });
});
