const { get, buf, pick, rnd } = require('../lib/utils');

const need = (c, usage) => { c.reply(`❌ Input do.\nUse: ${c.prefix}${usage}`); return false; };
module.exports = (add) => {
  const A = (name, desc, usage, fn, opts = {}) => add(name, desc, async (c) => {
    if (!c.input && usage) return need(c, `${name} ${usage}`);
    return fn(c);
  }, opts);
  const img = (name, desc, getUrl, cap) => add(name, desc, async (c) => c.send({ image: { url: await getUrl(c) }, caption: cap }));

  A('weather', 'Mausam', '<city>', async (c) => c.reply(`🌤️ ${await get(`https://wttr.in/${encodeURIComponent(c.input)}?format=%l:+%c+%t+(feels+%f)+💧%h+💨%w`)}`));
  A('wiki', 'Wikipedia summary', '<topic>', async (c) => {
    const d = await get(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(c.input.replace(/\s+/g, '_'))}`);
    c.reply(`📖 *${d.title}*\n\n${d.extract}\n\n🔗 ${d.content_urls?.mobile?.page || ''}`);
  }, { alias: ['wikipedia'] });
  A('define', 'English dictionary', '<word>', async (c) => {
    const d = (await get(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(c.input)}`))[0];
    const m = d.meanings.slice(0, 3).map((x) => `• _${x.partOfSpeech}_: ${x.definitions[0].definition}`).join('\n');
    c.reply(`📚 *${d.word}* ${d.phonetic || ''}\n${m}`);
  }, { alias: ['dictionary', 'meaning'] });
  A('translate', 'Translate: .translate hi | hello', '<lang> | <text>', async (c) => {
    const [l, ...t] = c.input.split('|'); const txt = t.join('|').trim();
    if (!txt) return c.reply('Use: .translate hi | How are you?');
    const d = await get(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(txt)}&langpair=autodetect|${encodeURIComponent(l.trim())}`);
    c.reply(`🌍 ${d.responseData.translatedText}`);
  }, { alias: ['tr'] });
  A('country', 'Country info', '<name>', async (c) => {
    const d = (await get(`https://restcountries.com/v3.1/name/${encodeURIComponent(c.input)}`))[0];
    c.send({ image: { url: d.flags.png }, caption: `🌍 *${d.name.common}*\n🏛️ Capital: ${(d.capital || ['-'])[0]}\n👥 Population: ${d.population.toLocaleString()}\n🌏 Region: ${d.region}\n🗣️ Languages: ${Object.values(d.languages || {}).join(', ')}\n💰 Currency: ${Object.values(d.currencies || {}).map((x) => x.name).join(', ')}` });
  });
  A('crypto', 'Crypto price', '<coin e.g. bitcoin>', async (c) => {
    const id = c.args[0].toLowerCase();
    const d = await get(`https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd,pkr,inr&include_24hr_change=true`);
    if (!d[id]) return c.reply('❌ Coin nahi mila (full naam likho: bitcoin, ethereum).');
    const x = d[id]; c.reply(`🪙 *${id.toUpperCase()}*\n💵 $${x.usd}\n🇵🇰 Rs ${x.pkr}\n🇮🇳 ₹${x.inr}\n📈 24h: ${x.usd_24h_change?.toFixed(2)}%`);
  }, { alias: ['coin2', 'price'] });
  A('exchange', 'Currency convert: .exchange 100 usd pkr', '<amount> <from> <to>', async (c) => {
    const [a, f, t] = c.args; const d = await get(`https://open.er-api.com/v6/latest/${f.toUpperCase()}`);
    const r = d.rates[t.toUpperCase()]; if (!r) return c.reply('❌ Currency code galat.');
    c.reply(`💱 ${a} ${f.toUpperCase()} = *${(a * r).toFixed(2)} ${t.toUpperCase()}*`);
  }, { alias: ['convert', 'forex'] });
  A('ip', 'IP lookup', '<ip>', async (c) => {
    const d = await get(`https://ipwho.is/${encodeURIComponent(c.args[0])}`);
    if (!d.success) return c.reply('❌ Invalid IP.');
    c.reply(`🌐 *${d.ip}*\n📍 ${d.city}, ${d.region}, ${d.country}\n🏢 ISP: ${d.connection?.isp}\n🕒 TZ: ${d.timezone?.id}`);
  }, { alias: ['iplookup'] });
  A('github', 'GitHub user info', '<username>', async (c) => {
    const d = await get(`https://api.github.com/users/${encodeURIComponent(c.args[0])}`);
    c.send({ image: { url: d.avatar_url }, caption: `🐙 *${d.login}* ${d.name ? `(${d.name})` : ''}\n📝 ${d.bio || '-'}\n📦 Repos: ${d.public_repos}\n👥 Followers: ${d.followers} | Following: ${d.following}\n🔗 ${d.html_url}` });
  }, { alias: ['gh'] });
  A('npm', 'NPM package info', '<package>', async (c) => {
    const d = await get(`https://registry.npmjs.org/${encodeURIComponent(c.args[0])}/latest`);
    c.reply(`📦 *${d.name}* v${d.version}\n${d.description || ''}\n🔗 https://www.npmjs.com/package/${d.name}`);
  });
  A('pokemon', 'Pokemon info', '<name>', async (c) => {
    const d = await get(`https://pokeapi.co/api/v2/pokemon/${encodeURIComponent(c.args[0].toLowerCase())}`);
    c.send({ image: { url: d.sprites.other['official-artwork'].front_default || d.sprites.front_default }, caption: `⚡ *${d.name.toUpperCase()}* #${d.id}\nType: ${d.types.map((t) => t.type.name).join(', ')}\nHeight: ${d.height / 10}m | Weight: ${d.weight / 10}kg\nAbilities: ${d.abilities.map((a) => a.ability.name).join(', ')}` });
  });
  A('numfact', 'Number fact', '', async (c) => c.reply(`🔢 ${await get(`http://numbersapi.com/${c.args[0] || 'random'}`)}`), { alias: ['numberfact'] });
  A('trivia', 'Trivia question', '', async (c) => {
    const d = (await get('https://opentdb.com/api.php?amount=1&type=multiple')).results[0];
    const dec = (s) => s.replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&amp;/g, '&');
    const opts = [...d.incorrect_answers, d.correct_answer].sort(() => Math.random() - 0.5).map(dec);
    c.reply(`❓ *${dec(d.question)}*\n(${d.category})\n\n${opts.map((o, i) => `${'ABCD'[i]}. ${o}`).join('\n')}\n\n||Answer: ${dec(d.correct_answer)}||`);
  }, { alias: ['quiz'] });
  A('catfact', 'Cat fact', '', async (c) => c.reply(`🐱 ${(await get('https://catfact.ninja/fact')).fact}`));
  A('dogfact', 'Dog fact', '', async (c) => c.reply(`🐶 ${(await get('https://dogapi.dog/api/v2/facts')).data[0].attributes.body}`));
  A('meal', 'Random recipe', '', async (c) => {
    const m = (await get('https://www.themealdb.com/api/json/v1/1/random.php')).meals[0];
    c.send({ image: { url: m.strMealThumb }, caption: `🍽️ *${m.strMeal}* (${m.strArea})\n\n${m.strInstructions.slice(0, 900)}...` });
  }, { alias: ['recipe'] });
  A('cocktail', 'Random cocktail', '', async (c) => {
    const m = (await get('https://www.thecocktaildb.com/api/json/v1/1/random.php')).drinks[0];
    c.send({ image: { url: m.strDrinkThumb }, caption: `🍹 *${m.strDrink}*\n${m.strInstructions}` });
  });
  A('agify', 'Naam se umar guess', '<name>', async (c) => { const d = await get(`https://api.agify.io/?name=${encodeURIComponent(c.args[0])}`); c.reply(`🎂 ${d.name}: ~${d.age} saal`); });
  A('genderize', 'Naam se gender guess', '<name>', async (c) => { const d = await get(`https://api.genderize.io/?name=${encodeURIComponent(c.args[0])}`); c.reply(`🚻 ${d.name}: ${d.gender} (${Math.round(d.probability * 100)}%)`); });
  A('nationalize', 'Naam se country guess', '<name>', async (c) => { const d = await get(`https://api.nationalize.io/?name=${encodeURIComponent(c.args[0])}`); c.reply(`🌍 ${d.name}: ${d.country.map((x) => `${x.country_id} ${Math.round(x.probability * 100)}%`).join(', ') || 'unknown'}`); });
  A('shorturl', 'Link chhota karo', '<url>', async (c) => c.reply(`🔗 ${await get(`https://is.gd/create.php?format=simple&url=${encodeURIComponent(c.args[0])}`)}`), { alias: ['short'] });
  A('iss', 'ISS location', '', async (c) => { const d = await get('http://api.open-notify.org/iss-now.json'); c.reply(`🛰️ ISS abhi: ${d.iss_position.latitude}, ${d.iss_position.longitude}\nhttps://maps.google.com/?q=${d.iss_position.latitude},${d.iss_position.longitude}`); });
  A('bored', 'Kuch karne ka idea', '', async (c) => c.reply(`🥱 ${(await get('https://bored-api.appbrewery.com/random')).activity}`), { alias: ['activity'] });
  A('worldtime', 'City ka time: .worldtime Asia/Karachi', '<Region/City>', async (c) => { const d = await get(`https://worldtimeapi.org/api/timezone/${c.args[0]}`); c.reply(`🕒 ${c.args[0]}\n${d.datetime.slice(0, 19).replace('T', ' ')} (UTC${d.utc_offset})`); });
  A('lyricsinfo', 'Song search (iTunes)', '<song name>', async (c) => {
    const d = (await get(`https://itunes.apple.com/search?term=${encodeURIComponent(c.input)}&limit=1&media=music`)).results[0];
    if (!d) return c.reply('❌ Nahi mila.');
    c.send({ image: { url: d.artworkUrl100.replace('100x100', '600x600') }, caption: `🎵 *${d.trackName}*\n👤 ${d.artistName}\n💿 ${d.collectionName}\n📅 ${d.releaseDate.slice(0, 10)}` });
  }, { alias: ['song'] });
  A('movie', 'Movie search (iTunes)', '<title>', async (c) => {
    const d = (await get(`https://itunes.apple.com/search?term=${encodeURIComponent(c.input)}&limit=1&media=movie`)).results[0];
    if (!d) return c.reply('❌ Nahi mila.');
    c.send({ image: { url: d.artworkUrl100.replace('100x100', '600x600') }, caption: `🎬 *${d.trackName}*\n🎭 ${d.primaryGenreName} | ${d.releaseDate.slice(0, 4)}\n\n${(d.longDescription || '').slice(0, 600)}` });
  });

  img('meme', 'Random meme', async () => (await get('https://meme-api.com/gimme')).url, '😂 Meme');
  img('cat', 'Cat photo', async () => (await get('https://api.thecatapi.com/v1/images/search'))[0].url, '🐱 Meow');
  img('dog', 'Dog photo', async () => (await get('https://dog.ceo/api/breeds/image/random')).message, '🐶 Woof');
  img('fox', 'Fox photo', async () => (await get('https://randomfox.ca/floof/')).image, '🦊 Fox');
  img('wallpaper', 'Random wallpaper', async () => `https://picsum.photos/1080/1920?random=${rnd(1, 99999)}`, '🖼️ Wallpaper');
  img('randomimg', 'Random image', async () => `https://picsum.photos/800/600?random=${rnd(1, 99999)}`, '🖼️ Random');
  img('avatar', 'Random avatar', async () => `https://api.dicebear.com/7.x/adventurer/png?seed=${rnd(1, 99999)}`, '🧑 Avatar');
  add('robohash', 'Robot avatar: .robohash name', async (c) => c.send({ image: { url: `https://robohash.org/${encodeURIComponent(c.input || 'rana')}.png?size=500x500` }, caption: '🤖 Robot' }));
};
