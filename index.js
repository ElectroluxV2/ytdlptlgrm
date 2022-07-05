const { Telegraf } = require('telegraf');
const execSync = require("child_process").execSync;

const bot = new Telegraf(process.env.BOT_TOKEN);

const valid_filters = {
    bassboost: {
        arg: 'bass=g={0}',
        base: 20
    },
    '8D': {
        arg: 'apulsator=hz={0}',
        base: 0.08
    },
    vaporwave: {
        arg: 'aresample=48000,asetrate=48000*{0}',
        base: 0.8
    },
    nightcore: {
        arg: 'aresample=48000,asetrate=48000*{0}',
        base: 1.25
    },
    phaser: {
        arg: 'aphaser=in_gain={0}',
        base: 0.4
    },
    tremolo: {
        arg: 'tremolo',
        base: false
    },
    vibrato: {
        arg: 'vibrato=f={0}',
        base: 6.5
    },
    reverse: {
        arg: 'areverse',
        base: false
    },
    treble: {
        arg: 'treble=g={0}',
        base: 5
    },
    normalizer: {
        arg: 'dynaudnorm=f={0}',
        base: 200
    },
    surrounding: {
        arg: 'surround',
        base: false
    },
    pulsator: {
        arg: 'apulsator=hz={0}',
        base: 1
    },
    subboost: {
        arg: 'asubboost',
        base: false
    },
    karaoke: {
        arg: 'stereotools=mlev={0}',
        base: 0.03
    },
    flanger: {
        arg: 'flanger',
        base: false
    },
    gate: {
        arg: 'agate',
        base: false
    },
    haas: {
        arg: 'haas',
        base: false
    },
    mcompand: {
        arg: 'mcompand',
        base: false
    }
}

String.prototype.formatUnicorn = String.prototype.formatUnicorn ||
    function () {
        "use strict";
        var str = this.toString();
        if (arguments.length) {
            var t = typeof arguments[0];
            var key;
            var args = ("string" === t || "number" === t) ?
                Array.prototype.slice.call(arguments)
                : arguments[0];

            for (key in args) {
                str = str.replace(new RegExp("\\{" + key + "\\}", "gi"), args[key]);
            }
        }

        return str;
    };


const parseFilters = args => {
    let counts = {};

    for (let i = 0; i < args.length; i++) {
        const ef = args[i];
        counts[ef] = counts[ef] ? counts[ef] + 1 : 1;
    }

    args = [...new Set(args)];

    const params = [];

    for (const arg of args) {
        if (!(arg in valid_filters)) {
            console.log('Missing filter: '+arg);
            continue;
        }

        const filter = valid_filters[arg];

        let n;
        //if (arg == 'vaporwave') {
        //    n = filter.base / counts[arg];
        //} else {
        n = filter.base * counts[arg];
        //}

        //const v = Math.round((n + Number.EPSILON) * 100) / 100;
        const combined = filter.arg.formatUnicorn(n);

        params.push(combined);
    }

    return params;
}

bot.command('filters', ctx => {
    let str = '';
    for (let key in valid_filters) {
        str += key;
        if (valid_filters[key].base) {
            str += '[+]'
        }

        str += ', ';
    }

    ctx.reply('Avaliable filters: ' + str.substring(0, str.length-2));
})

bot.on(['text', 'edited_message'], async ctx => {
    const msg = ctx.message ?? ctx.editedMessage;
    const text = msg.text;

    if (!text?.startsWith('http')) {
        return;
    }

    (async () => {
        try {
            const url = text.substring(0, text.indexOf(' '));
            const filters = text.substring(text.indexOf(' ') + 1).split(' ');
            const parsedFilters = parseFilters(filters);
            const combinedFilters = parsedFilters.join(',');

            const filtersNames = '-' + filters.join('_');

            const params = `--force-overwrites --exec "after_move:mv %(filepath)q %(filepath)q-XD && ffmpeg -nostats -loglevel 0 -i %(filepath)q-XD -af ${combinedFilters} %(filepath)q && rm %(filepath)q-XD"`;

            const execc = `yt-dlp -q -S "+res:480,codec,br" -J --no-simulate --recode-video mp4 -o "/var/www/html/v/%(id)s${filtersNames}.%(ext)s" ${combinedFilters.length !== 0 ? params : ''} ${url}`;

            console.info('Executing: ', execc);

            const buffer = execSync(execc);
            const resp = new Response(buffer);

            // console.log(await resp.text());

            const metadata = await resp.json();

            ctx.replyWithVideo(`http://skf.budziszm.pl/v/${metadata.id}${filtersNames}.mp4`, {
                caption: `${metadata.title}\nRequested by ${msg.from.username}`
            })

            ctx.deleteMessage(msg.message_id)
            // ctx.reply(`http://130.61.175.123/v/${metadata.id}.${metadata.ext}`, {reply_to_message_id: msg.message_id});

            console.info(`Done http://130.61.175.123/v/${metadata.id}${filtersNames}.mp4`);
        } catch (e) {
            ctx.reply(`error: ${e.message}`, {reply_to_message_id: msg.message_id});
        }
    })().then();
});


bot.launch();
// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
