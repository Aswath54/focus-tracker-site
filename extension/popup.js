// AuraFocus Popup Logic (popup.js)
const DEFAULT_BACKEND_URL = "https://focus-tracker-site-production.up.railway.app";
const LEGACY_BACKEND_URL = "https://focus-tracker-site-production-628b.up.railway.app";
const HISTORY_GROUPS = ["School", "Work", "Personal"];
const CREATE_GROUP_OPTION = "__create_group__";
const HISTORY_GROUP_DOMAINS = {
  School: [
    "wikipedia.org", "khanacademy.org", "coursera.org", "edx.org", "quizlet.com",
    "stackoverflow.com", "github.com", "w3schools.com", "canvas.instructure.com",
    "classroom.google.com", "desmos.com", "geogebra.org", "ixl.com", "grammarly.com",
    "turnitin.com", "jstor.org", "scholar.google.com"
  ],
  Work: [
    "slack.com", "notion.so", "trello.com", "asana.com", "monday.com", "linear.app",
    "figma.com", "dropbox.com", "docs.google.com", "sheets.google.com", "zoom.us"
  ],
  Personal: [
    "youtube.com", "netflix.com", "spotify.com", "reddit.com", "instagram.com",
    "facebook.com", "x.com", "tiktok.com", "amazon.com"
  ]
};

// Automatic session analytics categories. These are intentionally separate from
// the user-created history groups so the category chart stays consistent.
const ACTIVITY_CATEGORY_DOMAINS = {
  "Search Engines": [
    "google.com", "bing.com", "duckduckgo.com", "search.brave.com", "yahoo.com",
    "yandex.com", "baidu.com", "ecosia.org", "startpage.com", "qwant.com",
    "ask.com", "aol.com", "naver.com", "seznam.cz", "search.yahoo.com", "search.aol.com",
    "search.naver.com", "search.sogou.com", "so.com", "search.360.cn", "search.naver.com",
    "swisscows.com", "marginalia-search.com", "kagi.com", "search.gibiru.com"
  ],
  "Education & Learning": [
    "khanacademy.org", "coursera.org", "edx.org", "udemy.com", "quizlet.com",
    "duolingo.com", "brilliant.org", "codecademy.com", "freecodecamp.org",
    "w3schools.com", "geeksforgeeks.org", "jstor.org", "scholar.google.com",
    "classroom.google.com", "canvas.instructure.com", "blackboard.com", "moodle.org",
    "desmos.com", "geogebra.org", "chegg.com", "turnitin.com", "ixl.com",
    "academic.oup.com", "ocw.mit.edu", "openstax.org", "ted.com", "grammarly.com",
    "brilliant.org", "masterclass.com", "skillshare.com", "pluralsight.com", "datacamp.com",
    "mimo.org", "sololearn.com", "study.com", "sophia.org", "alison.com", "futurelearn.com",
    "openlearn.open.ac.uk", "open.ac.uk", "mit.edu", "stanford.edu", "harvard.edu",
    "ocw.tudelft.nl", "phet.colorado.edu", "ck12.org", "commonlit.org", "prodigygame.com",
    "brainly.com", "studocu.com", "coursehero.com", "getabstract.com", "edutopia.org"
  ],
  "Reference & Knowledge": [
    "wikipedia.org", "britannica.com", "encyclopedia.com", "wikihow.com", "archive.org",
    "scholarpedia.org", "snopes.com", "factcheck.org", "howstuffworks.com", "reference.com",
    "merriam-webster.com", "dictionary.com", "etymonline.com", "britannica.com",
    "worldhistory.org", "nationalgeographic.com", "infoplease.com", "encyclopedia.com",
    "archive.org", "gutenberg.org", "loc.gov", "si.edu", "thecanadianencyclopedia.ca"
  ],
  "Developer Tools": [
    "github.com", "gitlab.com", "bitbucket.org", "stackoverflow.com", "stackexchange.com",
    "npmjs.com", "pypi.org", "crates.io", "rubygems.org", "packagist.org", "docker.com",
    "hub.docker.com", "developer.mozilla.org", "web.dev", "dev.to", "codepen.io",
    "replit.com", "codesandbox.io", "jsfiddle.net", "leetcode.com", "hackerrank.com",
    "topcoder.com", "kaggle.com", "huggingface.co", "postman.com", "insomnia.rest",
    "gitkraken.com", "sourcegraph.com", "circleci.com", "travis-ci.com", "snyk.io",
    "vercel.com", "npmjs.org", "deno.com", "bun.sh", "learn.microsoft.com", "devdocs.io",
    "w3.org", "spec.whatwg.org", "llvm.org", "gnu.org", "launchpad.net", "gitea.com"
  ],
  "AI & Assistants": [
    "chatgpt.com", "chat.openai.com", "platform.openai.com", "openai.com", "claude.ai",
    "gemini.google.com", "copilot.microsoft.com", "perplexity.ai", "poe.com", "character.ai",
    "you.com", "jasper.ai", "writesonic.com", "midjourney.com", "runwayml.com",
    "stability.ai", "replicate.com", "cohere.com", "anthropic.com", "mistral.ai", "deepseek.com",
    "deepseek.ai", "grok.com", "x.ai", "meta.ai", "meta.com", "ai.google.dev", "aistudio.google.com",
    "notebooklm.google.com", "character.ai", "deepai.org", "phind.com", "blackbox.ai",
    "cursor.com", "windsurf.com", "v0.dev", "bolt.new", "lovable.dev", "suno.com", "udio.com",
    "elevenlabs.io", "synthesia.io", "heygen.com"
  ],
  "Productivity & Office": [
    "docs.google.com", "sheets.google.com", "slides.google.com", "calendar.google.com",
    "office.com", "microsoft365.com", "word.office.com", "excel.office.com", "powerpoint.office.com",
    "notion.so", "evernote.com", "todoist.com", "calendly.com", "obsidian.md", "airtable.com",
    "coda.io", "workflowy.com", "reclaim.ai", "zapier.com", "ifttt.com", "docusign.com",
    "keep.google.com", "forms.google.com", "sites.google.com", "onenote.com", "onenote.office.com",
    "microsoft.to-do", "todo.microsoft.com", "ticktick.com", "any.do", "milanote.com", "mem.ai",
    "grammarly.com", "loom.com", "read.ai", "fireflies.ai", "make.com", "n8n.io", "clickup.com"
  ],
  "Project Management": [
    "trello.com", "asana.com", "monday.com", "linear.app", "clickup.com", "jira.com",
    "atlassian.com", "basecamp.com", "smartsheet.com", "meistertask.com", "wrike.com",
    "height.app", "shortcut.com", "teamwork.com", "redbooth.com", "linear.app", "youtrack.com",
    "asana.com", "wrike.com", "project.microsoft.com", "planner.cloud.microsoft", "notion.so",
    "basecamp.com", "monday.com", "clubhouse.io", "taskade.com", "fibery.io", "plane.so"
  ],
  "Email": [
    "mail.google.com", "outlook.live.com", "outlook.com", "mail.yahoo.com", "proton.me",
    "protonmail.com", "mail.proton.me", "fastmail.com", "mail.zoho.com", "icloud.com",
    "mail.com", "gmx.com", "tutanota.com", "hey.com", "mail.google.com", "inbox.google.com",
    "fastmail.com", "mail.zoho.com", "mail.proton.me", "skiff.com", "runbox.com", "hushmail.com",
    "outlook.office.com", "e.mail.ru", "mail.qq.com", "mail.163.com"
  ],
  "Communication & Messaging": [
    "slack.com", "discord.com", "telegram.org", "web.telegram.org", "whatsapp.com",
    "web.whatsapp.com", "messenger.com", "signal.org", "mattermost.com", "zulip.com",
    "rocket.chat", "groupme.com", "viber.com", "wechat.com", "line.me", "teams.microsoft.com",
    "slack.com", "element.io", "matrix.org", "keybase.io", "threema.ch", "imo.im", "kik.com",
    "skype.com", "workplace.com", "guilded.gg", "discourse.org", "chat.google.com"
  ],
  "Meetings & Collaboration": [
    "zoom.us", "meet.google.com", "teams.microsoft.com", "webex.com", "gotomeeting.com",
    "whereby.com", "around.co", "gather.town", "bluejeans.com", "livestorm.co", "demodesk.com",
    "meet.jit.si", "gotomeeting.com", "ringcentral.com", "chime.aws", "webex.com", "8x8.com",
    "remotemeeting.com", "calendly.com", "cal.com", "doodle.com", "riverside.fm"
  ],
  "Cloud Storage": [
    "drive.google.com", "dropbox.com", "box.com", "onedrive.live.com", "mega.io",
    "pcloud.com", "sync.com", "mediafire.com", "zippyshare.com", "backblaze.com", "icloud.com",
    "drive.google.com", "photos.google.com", "mega.nz", "wetransfer.com", "send.vis.ee",
    "filemail.com", "icedrive.net", "filen.io", "tresorit.com", "egnyte.com", "sharepoint.com",
    "sharepoint.us", "boxcryptor.com", "storage.googleapis.com", "dropboxusercontent.com"
  ],
  "Design & Creative": [
    "figma.com", "canva.com", "adobe.com", "creativecloud.adobe.com", "photoshop.adobe.com",
    "behance.net", "dribbble.com", "sketch.com", "invisionapp.com", "miro.com", "framer.com",
    "webflow.com", "unsplash.com", "pexels.com", "pixabay.com", "coolors.co", "autodesk.com",
    "blender.org", "artstation.com", "deviantart.com", "procreate.com", "gimp.org", "krita.org",
    "instructables.com", "sketchfab.com", "polyhaven.com", "figma.com", "photopea.com", "pixlr.com",
    "remove.bg", "placeit.net", "creativemarket.com", "istockphoto.com", "gettyimages.com",
    "freepik.com", "storyset.com", "lottiefiles.com", "descript.com", "capcut.com", "veed.io"
  ],
  "Writing & Publishing": [
    "medium.com", "substack.com", "wordpress.com", "wordpress.org", "blogger.com", "ghost.org",
    "quillbot.com", "hemingwayapp.com", "prowritingaid.com", "scribd.com", "issuu.com",
    "livejournal.com", "wattpad.com", "reedsy.com", "author.today", "write.as", "ghost.io",
    "royalroad.com", "archiveofourown.org", "fanfiction.net", "inkitt.com", "scribophile.com",
    "prosecraft.io", "vocal.media", "beehiiv.com", "buttondown.email", "writefreely.org",
    "pressable.com", "blogspot.com", "telegra.ph", "notion.site"
  ],
  "Finance & Banking": [
    "paypal.com", "stripe.com", "venmo.com", "cash.app", "wise.com", "robinhood.com",
    "fidelity.com", "schwab.com", "vanguard.com", "chase.com", "bankofamerica.com",
    "wellsfargo.com", "capitalone.com", "americanexpress.com", "coinbase.com", "kraken.com",
    "binance.com", "sofi.com", "mint.com", "creditkarma.com", "nerdwallet.com", "quickbooks.intuit.com",
    "citi.com", "usbank.com", "pnc.com", "td.com", "ally.com", "discover.com", "barclays.com",
    "usaa.com", "navyfederal.org", "etrade.com", "schwab.com", "merrilledge.com", "public.com",
    "cash.app", "squareup.com", "zellepay.com", "wise.com", "remitly.com", "payoneer.com",
    "crypto.com", "gemini.com", "ledger.com", "tastytrade.com", "empower.com", "rocketmoney.com"
  ],
  "Shopping & Marketplaces": [
    "amazon.com", "ebay.com", "walmart.com", "target.com", "bestbuy.com", "etsy.com",
    "shopify.com", "aliexpress.com", "temu.com", "nike.com", "homedepot.com", "lowes.com",
    "costco.com", "macys.com", "wayfair.com", "zappos.com", "newegg.com", "shein.com",
    "sephora.com", "ulta.com", "ikea.com", "patagonia.com", "etsy.com", "alibaba.com", "shein.com",
    "wayfair.com", "overstock.com", "chewy.com", "gamestop.com", "dickssportinggoods.com",
    "rei.com", "kohls.com", "nordstrom.com", "tjmaxx.tjx.com", "asos.com", "hm.com", "zara.com",
    "uniqlo.com", "adidas.com", "underarmour.com", "apple.com", "store.google.com", "bhphotovideo.com",
    "adorama.com", "thriftbooks.com", "abebooks.com", "mercari.com", "poshmark.com", "depop.com"
  ],
  "News & Journalism": [
    "nytimes.com", "washingtonpost.com", "theguardian.com", "bbc.com", "cnn.com", "foxnews.com",
    "npr.org", "apnews.com", "reuters.com", "wsj.com", "bloomberg.com", "politico.com",
    "vox.com", "usatoday.com", "latimes.com", "newsweek.com", "time.com", "theatlantic.com",
    "economist.com", "news.google.com", "axios.com", "thehill.com", "cbsnews.com", "abcnews.go.com",
    "nbcnews.com", "aljazeera.com", "dw.com", "france24.com", "cbc.ca", "cbsnews.com", "pbs.org",
    "propublica.org", "theintercept.com", "apnews.com", "axios.com", "semfor.com", "fortune.com",
    "forbes.com", "marketwatch.com", "scmp.com", "japantimes.co.jp", "timesofindia.indiatimes.com"
  ],
  "Social Media": [
    "facebook.com", "instagram.com", "x.com", "linkedin.com", "threads.net", "pinterest.com",
    "snapchat.com", "tiktok.com", "mastodon.social", "tumblr.com", "weibo.com", "vk.com",
    "flickr.com", "nextdoor.com", "bereal.com", "clubhouse.com", "bluesky.app", "bsky.social",
    "threads.com", "mastodon.online", "pixelfed.social", "lemmy.world", "mewe.com", "gab.com",
    "gettr.com", "truthsocial.com", "vk.com", "ok.ru", "weverse.io", "patreon.com", "ko-fi.com",
    "buymeacoffee.com", "cara.app", "vsco.co", "strava.com", "letterboxd.com"
  ],
  "Forums & Communities": [
    "reddit.com", "quora.com", "4chan.org", "lemmy.world", "news.ycombinator.com",
    "producthunt.com", "discourse.org", "theconversation.com", "stackexchange.com", "answers.com",
    "discord.com", "community.cloudflare.com", "forums.tomsguide.com", "forums.tomshardware.com",
    "boards.ie", "resetera.com", "neogaf.com", "lemmy.ml", "lobste.rs", "indiehackers.com",
    "stackprinter.com", "community.atlassian.com", "support.google.com", "answers.microsoft.com",
    "discuss.python.org", "community.spiceworks.com", "forum.xda-developers.com", "bogleheads.org"
  ],
  "Video & Streaming": [
    "youtube.com", "netflix.com", "hulu.com", "disneyplus.com", "max.com", "primevideo.com",
    "twitch.tv", "vimeo.com", "dailymotion.com", "crunchyroll.com", "peacocktv.com",
    "paramountplus.com", "tubi.tv", "pluto.tv", "rumble.com", "kick.com", "watch.nba.com",
    "max.com", "peacocktv.com", "crunchyroll.com", "discoveryplus.com", "fubo.tv", "roku.com",
    "plex.tv", "curiositystream.com", "nebula.tv", "kanopy.com", "viki.com", "funimation.com",
    "dazn.com", "fox.com", "abc.com", "cbs.com", "nbc.com", "player.twitch.tv", "bilibili.com",
    "archive.org/details", "ted.com", "vevo.com", "9now.com.au", "hotstar.com"
  ],
  "Music & Audio": [
    "spotify.com", "music.apple.com", "soundcloud.com", "tidal.com", "deezer.com", "pandora.com",
    "bandcamp.com", "audible.com", "iheart.com", "last.fm", "audiomack.com", "mixcloud.com",
    "music.youtube.com", "npr.org", "music.amazon.com", "music.youtube.com", "music.tidal.com",
    "qobuz.com", "anghami.com", "boomplay.com", "genius.com", "ultimate-guitar.com", "songsterr.com",
    "radio.garden", "podcasts.apple.com", "podcasts.google.com", "pocketcasts.com", "podbean.com",
    "overcast.fm", "audiobooks.com", "libro.fm", "patreon.com"
  ],
  "Gaming": [
    "steampowered.com", "store.steampowered.com", "epicgames.com", "xbox.com", "playstation.com",
    "nintendo.com", "roblox.com", "minecraft.net", "itch.io", "riotgames.com", "leagueoflegends.com",
    "battle.net", "blizzard.com", "ea.com", "ubisoft.com", "gog.com", "chess.com", "lichess.org",
    "poki.com", "miniclip.com", "kongregate.com", "store.steampowered.com", "itch.io", "gog.com",
    "humblebundle.com", "nexusmods.com", "modrinth.com", "curseforge.com", "op.gg", "u.gg",
    "tracker.gg", "faceit.com", "lichess.org", "chess.com", "boardgamearena.com", "coolmathgames.com",
    "crazygames.com", "y8.com", "poki.com", "friv.com", "jackbox.tv", "playtogether.game"
  ],
  "Sports": [
    "espn.com", "sports.yahoo.com", "nba.com", "nfl.com", "mlb.com", "nhl.com", "fifa.com",
    "olympics.com", "skysports.com", "cbssports.com", "bleacherreport.com", "theathletic.com",
    "formula1.com", "ufc.com", "wwe.com", "ncaasports.com", "strava.com", "olympics.com",
    "mlssoccer.com", "premierleague.com", "uefa.com", "fifa.com", "f1.com", "motogp.com",
    "pga.com", "pgatour.com", "lpga.com", "atptour.com", "wtatennis.com", "worldathletics.org",
    "flashscore.com", "sofascore.com", "racingpost.com", "bleacherreport.com", "sports-reference.com"
  ],
  "Travel & Transportation": [
    "maps.google.com", "maps.apple.com", "tripadvisor.com", "expedia.com", "booking.com",
    "airbnb.com", "kayak.com", "vrbo.com", "delta.com", "united.com", "southwest.com", "aa.com",
    "uber.com", "lyft.com", "amtrak.com", "marriott.com", "hilton.com", "hotels.com", "skyscanner.com",
    "rome2rio.com", "trainline.com", "google.com/maps", "maps.google.com", "waze.com", "openstreetmap.org",
    "mapquest.com", "rome2rio.com", "skyscanner.net", "kayak.com", "priceline.com", "vrbo.com",
    "turo.com", "enterprise.com", "hertz.com", "avis.com", "booking.com", "agoda.com", "hostelworld.com",
    "flightaware.com", "flightradar24.com", "greyhound.com", "flixbus.com", "lyft.com", "uber.com"
  ],
  "Food & Delivery": [
    "doordash.com", "ubereats.com", "grubhub.com", "instacart.com", "postmates.com", "seamless.com",
    "foodnetwork.com", "allrecipes.com", "yelp.com", "opentable.com", "ubereats.com", "hellofresh.com",
    "blueapron.com", "tasty.co", "seriouseats.com", "doordash.com", "chownow.com", "toasttab.com",
    "grubhub.com", "ubereats.com", "deliveroo.co.uk", "just-eat.com", "wolt.com", "gopuff.com",
    "thespruceeats.com", "kingarthurbaking.com", "budgetbytes.com", "eatingwell.com", "yummly.com",
    "food52.com", "bonappetit.com", "tasteofhome.com", "blueapron.com", "misfitsmarket.com"
  ],
  "Health & Fitness": [
    "webmd.com", "mayoclinic.org", "healthline.com", "cdc.gov", "nih.gov", "myfitnesspal.com",
    "fitbit.com", "onepeloton.com", "calm.com", "headspace.com", "goodrx.com", "healthcare.gov",
    "everydayhealth.com", "verywellhealth.com", "mindbodyonline.com", "alltrails.com", "who.int",
    "clevelandclinic.org", "hopkinsmedicine.org", "medlineplus.gov", "health.harvard.edu", "nccih.nih.gov",
    "psychologytoday.com", "therapyden.com", "betterhelp.com", "talkspace.com", "noom.com", "strava.com",
    "nike.com", "adidas.com", "garmin.com", "oura.com", "withings.com", "strong.app", "fitbod.me",
    "yogajournal.com", "sleepfoundation.org", "verywellmind.com", "openpathcollective.org"
  ],
  "Jobs & Careers": [
    "indeed.com", "glassdoor.com", "monster.com", "ziprecruiter.com", "lever.co", "greenhouse.io",
    "workday.com", "dice.com", "wellfound.com", "upwork.com", "fiverr.com", "freelancer.com",
    "remoteok.com", "weworkremotely.com", "builtin.com", "careers.google.com", "usajobs.gov",
    "linkedin.com/jobs", "ziprecruiter.com", "simplyhired.com", "careerbuilder.com", "dice.com",
    "wellfound.com", "otta.com", "ycombinator.com/jobs", "workable.com", "lever.co", "greenhouse.io",
    "ashbyhq.com", "remote.co", "flexjobs.com", "idealist.org", "governmentjobs.com", "handshake.com",
    "upwork.com", "fiverr.com", "toptal.com", "contra.com", "freelancer.com"
  ],
  "Business & CRM": [
    "salesforce.com", "hubspot.com", "zendesk.com", "intercom.com", "pipedrive.com", "oracle.com",
    "sap.com", "intuit.com", "xero.com", "freshbooks.com", "gusto.com", "adp.com", "servicenow.com",
    "docusign.com", "qualtrics.com", "gartner.com", "monday.com", "freshdesk.com", "helpscout.com",
    "intercom.com", "close.com", "salesloft.com", "outreach.io", "gong.io", "stripe.com", "squareup.com",
    "shopify.com", "quickbooks.intuit.com", "xero.com", "waveapps.com", "zoho.com", "dynamics.com",
    "netsuite.com", "workday.com", "adp.com", "rippling.com", "deel.com", "remote.com", "ironcladapp.com"
  ],
  "Cloud & Infrastructure": [
    "aws.amazon.com", "console.aws.amazon.com", "cloud.google.com", "console.cloud.google.com",
    "azure.microsoft.com", "portal.azure.com", "digitalocean.com", "linode.com", "heroku.com",
    "vercel.com", "netlify.com", "cloudflare.com", "fastly.com", "firebase.google.com", "render.com",
    "railway.app", "supabase.com", "fly.io", "terraform.io", "kubernetes.io", "aws.amazon.com",
    "console.aws.amazon.com", "console.cloud.google.com", "cloud.google.com", "azure.microsoft.com",
    "portal.azure.com", "akamai.com", "vercel.com", "netlify.com", "render.com", "heroku.com",
    "digitalocean.com", "vultr.com", "ovhcloud.com", "scaleway.com", "linode.com", "hetzner.com",
    "grafana.com", "datadoghq.com", "newrelic.com", "sentry.io", "statuspage.io", "uptimerobot.com",
    "docker.com", "hub.docker.com", "ghcr.io", "cloudflare.com", "fastly.com", "hashicorp.com"
  ],
  "Security & Privacy": [
    "1password.com", "lastpass.com", "bitwarden.com", "nordvpn.com", "expressvpn.com", "protonvpn.com",
    "virustotal.com", "haveibeenpwned.com", "privacytools.io", "malwarebytes.com", "avast.com",
    "kaspersky.com", "okta.com", "auth0.com", "tailscale.com", "1password.ca", "keepersecurity.com",
    "dashlane.com", "proton.me", "protonvpn.com", "mullvad.net", "surfshark.com", "torproject.org",
    "privacyguides.org", "eff.org", "haveibeenpwned.com", "securityheaders.com", "urlscan.io",
    "abuseipdb.com", "shodan.io", "censys.io", "letsencrypt.org", "duo.com", "cloud.google.com/security",
    "malwarebytes.com", "eset.com", "bitdefender.com", "avira.com", "crowdstrike.com", "1password.com"
  ],
  "Government & Civic": [
    "usa.gov", "irs.gov", "whitehouse.gov", "congress.gov", "courts.gov", "gov.uk", "canada.ca",
    "service.gov.au", "europa.eu", "usa.gov", "vote.gov", "sos.ca.gov", "ny.gov", "data.gov",
    "canada.ca", "gov.uk", "gov.au", "irs.gov", "ssa.gov", "uscis.gov", "state.gov", "travel.state.gov",
    "benefits.gov", "medicare.gov", "medicaid.gov", "usa.gov", "data.gov", "regulations.gov",
    "census.gov", "cdc.gov", "fda.gov", "nih.gov", "weather.gov", "congress.gov", "parliament.uk",
    "europa.eu", "un.org", "worldbank.org", "oecd.org"
  ],
  "Legal": [
    "law.cornell.edu", "justia.com", "findlaw.com", "avvo.com", "legalzoom.com", "nolo.com",
    "courtlistener.com", "casetext.com", "martindale.com", "americanbar.org", "law.justia.com",
    "law.cornell.edu", "law.cornell.edu", "law360.com", "lexisnexis.com", "westlaw.com", "findlaw.com",
    "nolo.com", "lawyers.com", "lawyers.com", "uscourts.gov", "supremecourt.gov", "legal.thomsonreuters.com"
  ],
  "Real Estate": [
    "zillow.com", "redfin.com", "realtor.com", "trulia.com", "apartments.com", "homes.com",
    "compass.com", "rightmove.co.uk", "remax.com", "coldwellbanker.com", "opendoor.com", "redfin.com",
    "zillow.com", "realtor.com", "trulia.com", "zoopla.co.uk", "onthemarket.com", "loopnet.com",
    "crexi.com", "realtor.ca", "realestate.com.au", "domain.com.au", "propertyfinder.ae",
    "apartments.com", "rent.com", "rentcafe.com", "hotpads.com", "padmapper.com", "streeteasy.com"
  ],
  "Weather & Time": [
    "weather.com", "accuweather.com", "wunderground.com", "weather.gov", "windy.com",
    "timeanddate.com", "weatherapi.com", "meteoblue.com", "forecast.weather.gov", "weather.gov",
    "windy.com", "yr.no", "metoffice.gov.uk", "bom.gov.au", "ecowitt.net", "weather.gc.ca",
    "time.is", "worldtimebuddy.com", "timeanddate.com", "sunrise-sunset.org", "meteostat.net",
    "ventusky.com", "rainviewer.com", "tomorrow.io"
  ]
};

// A few hostnames serve several unrelated products. Apply path-specific rules
// before the broad domain map so the page's actual use wins over its parent site.
const ACTIVITY_CATEGORY_PATHS = [
  { host: "linkedin.com", path: /^\/jobs(?:\/|$)/, category: "Jobs & Careers" },
  { host: "ycombinator.com", path: /^\/jobs(?:\/|$)/, category: "Jobs & Careers" },
  { host: "youtube.com", path: /^\/(?:music|playlist)(?:\/|$)/, category: "Music & Audio" },
  { host: "youtube.com", path: /^\/(?:watch|shorts|live|feed)(?:\/|$)/, category: "Video & Streaming" },
  { host: "google.com", path: /^\/maps(?:\/|$)/, category: "Travel & Transportation" },
  { host: "google.com", path: /^\/search(?:\/|$)/, category: "Search Engines" },
  { host: "amazon.com", path: /^\/(?:music|music\/unlimited)(?:\/|$)/, category: "Music & Audio" },
  { host: "amazon.com", path: /^\/(?:primevideo|gp\/video)(?:\/|$)/, category: "Video & Streaming" },
  { host: "amazon.com", path: /^\/(?:jobs|hiring)(?:\/|$)/, category: "Jobs & Careers" },
  { host: "apple.com", path: /^\/(?:apple-music|music)(?:\/|$)/, category: "Music & Audio" },
  { host: "apple.com", path: /^\/(?:tv|apple-tv)(?:\/|$)/, category: "Video & Streaming" },
  { host: "archive.org", path: /^\/details(?:\/|$)/, category: "Video & Streaming" },
  { host: "npr.org", path: /^\/sections\/(?:music|music-news)(?:\/|$)/, category: "Music & Audio" },
  { host: "npr.org", path: /^\/sections\/(?:news|politics|world)(?:\/|$)/, category: "News & Journalism" }
];
let BACKEND_URL = DEFAULT_BACKEND_URL;

async function loadBackendUrl() {
  try {
    const result = await chrome.storage.local.get("backendUrl");
    const stored = typeof result.backendUrl === "string" ? result.backendUrl.trim() : "";
    if (stored && stored.replace(/\/+$/, "") !== LEGACY_BACKEND_URL) {
      BACKEND_URL = stored.replace(/\/+$/, "");
    } else if (stored) {
      await chrome.storage.local.set({ backendUrl: DEFAULT_BACKEND_URL });
      BACKEND_URL = DEFAULT_BACKEND_URL;
    }
  } catch (e) {
    console.warn("Could not read backend URL from storage; using default.", e);
  }
}

function backendPath(path) {
  return `${BACKEND_URL}${path}`;
}

function bytesToBase64Url(bytes) {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function createRandomString(byteLength = 32) {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return bytesToBase64Url(bytes);
}

async function createCodeChallenge(codeVerifier) {
  const data = new TextEncoder().encode(codeVerifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return bytesToBase64Url(new Uint8Array(digest));
}

document.addEventListener("DOMContentLoaded", async () => {
  await loadBackendUrl();

  // Elements
  const statusDot = document.getElementById("status-dot");
  const statusLabel = document.getElementById("status-label");
  const accountForm = document.getElementById("account-form");
  const accountStatusText = document.getElementById("account-status-text");
  const accountError = document.getElementById("account-error");
  const accountModeNote = document.getElementById("account-mode-note");
  const btnAccountGoogle = document.getElementById("btn-account-google");
  const btnAccountLogout = document.getElementById("btn-account-logout");
  const childLogoutForm = document.getElementById("child-logout-form");
  const childLogoutPassword = document.getElementById("child-logout-password");
  const childLogoutError = document.getElementById("child-logout-error");
  const btnChildLogoutCancel = document.getElementById("btn-child-logout-cancel");
  const parentControlPanel = document.getElementById("parent-control-panel");
  const childSyncPanel = document.getElementById("child-sync-panel");
  const parentTimerPanel = document.getElementById("parent-timer-panel");
  const childSyncForm = document.getElementById("child-sync-form");
  const childSyncPassword = document.getElementById("child-sync-password");
  const childSyncError = document.getElementById("child-sync-error");
  const childSyncSuccess = document.getElementById("child-sync-success");
  const parentPasswordForm = document.getElementById("parent-password-form");
  const parentPasswordInput = document.getElementById("parent-password");
  const parentPasswordConfirm = document.getElementById("parent-password-confirm");
  const parentPasswordError = document.getElementById("parent-password-error");
  const parentPasswordSuccess = document.getElementById("parent-password-success");
  
  const secSetupPassword = document.getElementById("sec-setup-password");
  const secActiveSession = document.getElementById("sec-active-session");
  const secIdleSession = document.getElementById("sec-idle-session");
  const secPermanentFeedback = document.getElementById("sec-permanent-feedback");
  const secWhitelist = document.getElementById("sec-whitelist");
  const parentTestView = document.getElementById("parent-test-view");
  
  // Password Setup Elements
  const passwordSetupForm = document.getElementById("password-setup-form");
  const newPasswordInput = document.getElementById("new-password");
  const confirmPasswordInput = document.getElementById("confirm-password");
  const passwordSetupError = document.getElementById("password-setup-error");
  const focusModeSelect = document.getElementById("focus-mode-select");
  const focusModeHelp = document.getElementById("focus-mode-help");
  
  // Timer Elements
  const countdownText = document.getElementById("countdown-text");
  const presetBtns = document.querySelectorAll(".preset-btn");
  const customMinutesInput = document.getElementById("custom-minutes");
  const btnSetCustom = document.getElementById("btn-set-custom");
  const btnStartFocus = document.getElementById("btn-start-focus");
  const selfSessionPassword = document.getElementById("self-session-password");
  const selfSessionPasswordConfirm = document.getElementById("self-session-password-confirm");
  const parentPresetBtns = document.querySelectorAll(".parent-preset-btn");
  const parentCustomMinutesInput = document.getElementById("parent-custom-minutes");
  const btnParentSetCustom = document.getElementById("btn-parent-set-custom");
  const btnParentStartFocus = document.getElementById("btn-parent-start-focus");
  const parentSessionPassword = document.getElementById("parent-session-password");
  const parentSessionPasswordConfirm = document.getElementById("parent-session-password-confirm");
  const parentStopPassword = document.getElementById("parent-stop-password");
  const btnParentStopFocus = document.getElementById("btn-parent-stop-focus");
  const parentStopControls = document.getElementById("parent-stop-controls");
  const parentStopError = document.getElementById("parent-stop-error");
  const btnParentResetSync = document.getElementById("btn-parent-reset-sync");
  const parentResetSyncError = document.getElementById("parent-reset-sync-error");
  const parentLinkNote = document.getElementById("parent-link-note");
  
  // Unlock Elements
  const unlockPasswordInput = document.getElementById("unlock-password-input");
  const btnUnlock = document.getElementById("btn-unlock");
  const unlockError = document.getElementById("unlock-error");
  
  // Whitelist Elements
  const newSiteInput = document.getElementById("new-site-input");
  const newSiteCategorySelect = document.getElementById("new-site-category");
  const btnAddSite = document.getElementById("btn-add-site");
  const whitelistAddSiteRow = document.querySelector("#sec-whitelist .add-site-row");
  const whitelistList = document.getElementById("whitelist-list");
  const whitelistActionError = document.getElementById("whitelist-action-error");
  const sessionActivityPie = document.getElementById("session-activity-pie");
  const sessionActivityLegend = document.getElementById("session-activity-legend");
  const sessionActivityLabel = document.getElementById("session-activity-label");
  const sessionActivityImageDownload = document.getElementById("session-activity-image-download");
  const groupActivityPie = document.getElementById("group-activity-pie");
  const groupActivityLegend = document.getElementById("group-activity-legend");
  const groupActivityImageDownload = document.getElementById("group-activity-image-download");
  const blockedSiteActivityList = document.getElementById("blocked-site-activity-list");
  const blockedSiteActivityDownload = document.getElementById("blocked-site-activity-download");
  const parentSessionActivityPanel = document.getElementById("parent-session-activity-panel");
  const parentAccessRequestList = document.getElementById("parent-access-request-list");
  const parentSessionActivityPie = document.getElementById("parent-session-activity-pie");
  const parentSessionActivityLegend = document.getElementById("parent-session-activity-legend");
  const parentSessionActivityLabel = document.getElementById("parent-session-activity-label");
  const parentSessionActivityImageDownload = document.getElementById("parent-session-activity-image-download");
  const parentGroupActivityPie = document.getElementById("parent-group-activity-pie");
  const parentGroupActivityLegend = document.getElementById("parent-group-activity-legend");
  const parentGroupActivityImageDownload = document.getElementById("parent-group-activity-image-download");
  const parentBlockedSiteActivityList = document.getElementById("parent-blocked-site-activity-list");
  const parentBlockedSiteActivityDownload = document.getElementById("parent-blocked-site-activity-download");
  const browsingHistoryPanel = document.getElementById("browsing-history-panel");
  const browsingHistoryRange = document.getElementById("browsing-history-range");
  const browsingHistoryRangeNote = document.getElementById("browsing-history-range-note");
  const browsingHistoryPie = document.getElementById("browsing-history-pie");
  const browsingHistoryLegend = document.getElementById("browsing-history-legend");
  
  // Whitelist Locking Elements
  const whitelistLockOverlay = document.getElementById("whitelist-lock-overlay");
  const btnPromptUnlockWhitelist = document.getElementById("btn-prompt-unlock-whitelist");
  const whitelistUnlockInputContainer = document.getElementById("whitelist-unlock-input-container");
  const whitelistUnlockPassword = document.getElementById("whitelist-unlock-password");
  const btnConfirmUnlockWhitelist = document.getElementById("btn-confirm-unlock-whitelist");
  const btnCancelUnlockWhitelist = document.getElementById("btn-cancel-unlock-whitelist");
  const whitelistUnlockError = document.getElementById("whitelist-unlock-error");

  // Change Password Elements
  const secChangePassword = document.getElementById("sec-change-password");
  const changePasswordForm = document.getElementById("change-password-form");
  const changeOldPassword = document.getElementById("change-old-password");
  const changeNewPassword = document.getElementById("change-new-password");
  const changeConfirmPassword = document.getElementById("change-confirm-password");
  const changePasswordError = document.getElementById("change-password-error");
  const changePasswordSuccess = document.getElementById("change-password-success");

  // Feedback Elements
  const secFeedback = document.getElementById("sec-feedback");
  const btnThumbUp = document.getElementById("btn-thumb-up");
  const btnThumbDown = document.getElementById("btn-thumb-down");
  const starBtns = document.querySelectorAll("#sec-feedback .star-btn");
  const feedbackComments = document.getElementById("feedback-comments");
  const btnSubmitFeedback = document.getElementById("btn-submit-feedback");
  const btnLaterFeedback = document.getElementById("btn-later-feedback");
  const feedbackSuccessMsg = document.getElementById("feedback-success-msg");
  const feedbackError = document.getElementById("feedback-error");
  const permThumbUp = document.getElementById("perm-btn-thumb-up");
  const permThumbDown = document.getElementById("perm-btn-thumb-down");
  const permStarBtns = document.querySelectorAll(".perm-star-btn");
  const permFeedbackComments = document.getElementById("perm-feedback-comments");
  const permFeedbackSubmit = document.getElementById("perm-feedback-submit");
  const permFeedbackError = document.getElementById("perm-feedback-error");
  const permFeedbackSuccess = document.getElementById("perm-feedback-success");

  // Local popup states
  let activeDurationSeconds = 1500; // Default 25m
  let isWhitelistUnlocked = false; // Temp unlock for this popup instance
  let countdownInterval = null;
  let currentAllowedUrls = [];
  let feedbackUserId = null;
  let accountToken = null;
  let accountUser = null;
  let focusMode = "self";
  let parentPassword = "";
  let hasParentPassword = false;
  let childSyncUnlocked = false;
  let modeLocked = false;
  let childLinked = false;
  let childSyncCompletedAt = 0;
  let latestSessionActivity = {};
  let latestSessionActivityIsActive = false;
  let latestSessionActivityIsParentView = false;
  let parentDurationSeconds = 1500;
  let hasSubmittedSessionFeedback = false;
  let permanentFeedback = {
    rating: 0,
    thumb: null,
    comments: ""
  };
  let historyGroups = [...HISTORY_GROUPS];

  // Initialize view
  setupPasswordToggles();
  await loadAccount();
  await loadSessionFeedbackState();
  await loadPermanentFeedback();
  await refreshState();
  refreshSessionActivity();
  const sessionActivityInterval = setInterval(() => {
    refreshSessionActivity();
    refreshParentAccessRequests();
  }, 5000);
  const browsingHistoryInterval = setInterval(renderBrowsingHistory, 30000);
  feedbackUserId = await getOrCreateFeedbackUserId();
  bindPermanentFeedbackControls();

  window.addEventListener("unload", () => {
    clearInterval(sessionActivityInterval);
    clearInterval(browsingHistoryInterval);
  });

  // --- STATE AND VIEW MANAGEMENT ---
  async function refreshState() {
    chrome.runtime.sendMessage({ type: "GET_STATE" }, (response) => {
      if (chrome.runtime.lastError || !response || !response.success) {
        console.error("Could not fetch state from background service.");
        return;
      }
      
      const state = response.state;
      currentAllowedUrls = state.allowedUrls;
      focusMode = state.focusMode || focusMode;
      modeLocked = !!state.modeLocked;
      hasParentPassword = !!state.hasParentPassword;
      childSyncUnlocked = !!state.childSyncUnlocked;
      childLinked = !!state.childLinked;
      childSyncCompletedAt = Number(state.childSyncCompletedAt) || 0;
      // Older builds stored only modeLocked, which could hide the sync form
      // before this device had actually verified the parent password.
      if (modeLocked && !childSyncUnlocked) {
        modeLocked = false;
        chrome.storage.local.set({ modeLocked: false });
      }
      syncProgress();
      const isChildMode = focusMode === "child";
      const isParentMode = focusMode === "parent";
      const childSyncReady = childSyncUnlocked && childLinked && childSyncCompletedAt > 0;
      const isAccountMode = isParentMode || isChildMode;
      const hasSignedInAccount = !!(accountToken && accountUser);
      const accountRequired = isAccountMode && !hasSignedInAccount;
      const parentFeaturesReady = !isParentMode || (hasSignedInAccount && childLinked && childSyncCompletedAt > 0 && hasParentPassword);
      const showParentOnlyPanels = isParentMode;
      updateChildTimerControls();
      const canViewBrowsingHistory = !isAccountMode || (
        hasSignedInAccount && (isParentMode ? childLinked && childSyncCompletedAt > 0 : childSyncReady)
      );
      if (browsingHistoryPanel) {
        browsingHistoryPanel.style.display = canViewBrowsingHistory ? "block" : "none";
      }
      if (canViewBrowsingHistory) renderBrowsingHistory();

      if (parentTestView) {
        parentTestView.style.display = isParentMode && !accountRequired ? "flex" : "none";
      }
      if (document.body) {
        document.body.classList.toggle("parent-mode-active", isParentMode);
      }
      
      // Render Whitelist
      renderWhitelist(currentAllowedUrls);
      if (parentSessionActivityPanel) {
        parentSessionActivityPanel.style.display = isParentMode && hasSignedInAccount && childLinked && childSyncCompletedAt && hasParentPassword ? "block" : "none";
      }
      if (isParentMode && hasSignedInAccount && childLinked && childSyncCompletedAt && hasParentPassword) {
        refreshParentAccessRequests();
      }
      if (focusModeSelect) {
        focusModeSelect.value = focusMode;
        focusModeSelect.disabled = modeLocked;
        updateFocusModeHelp();
      }
      if (accountModeNote) {
        accountModeNote.style.display = accountRequired ? "block" : "none";
      }
      if (secPermanentFeedback) {
        secPermanentFeedback.style.display = accountRequired || isChildMode || !parentFeaturesReady ? "none" : "block";
      }
      secWhitelist.style.display = (isChildMode && !childSyncReady) || !parentFeaturesReady ? "none" : "block";
      if (whitelistAddSiteRow) whitelistAddSiteRow.style.display = isChildMode ? "none" : "flex";
      secChangePassword.style.display = "none";
      if (parentControlPanel) {
        parentControlPanel.style.display = isParentMode && hasSignedInAccount && (!childLinked || !childSyncCompletedAt || !hasParentPassword) ? "block" : "none";
      }
      if (childSyncPanel) {
        childSyncPanel.style.display = isParentMode || !hasSignedInAccount ? "none" : state.focusMode === "child" && (!childSyncUnlocked || !childLinked || !childSyncCompletedAt) ? "block" : "none";
      }
      if (parentTimerPanel) {
        const showParentTimer = isParentMode && hasSignedInAccount && childLinked && childSyncCompletedAt && hasParentPassword;
        parentTimerPanel.style.display = showParentTimer ? "block" : "none";
      }
      updateParentTimerControls();

      if (accountRequired) {
        showSection(null);
        if (secWhitelist) secWhitelist.style.display = "none";
        if (secChangePassword) secChangePassword.style.display = "none";
        if (secPermanentFeedback) secPermanentFeedback.style.display = "none";
        if (parentControlPanel) parentControlPanel.style.display = "none";
        if (childSyncPanel) childSyncPanel.style.display = "none";
        if (parentTimerPanel) parentTimerPanel.style.display = "none";
        if (parentSessionActivityPanel) parentSessionActivityPanel.style.display = "none";
        stopLocalCountdown();
        if (whitelistLockOverlay) whitelistLockOverlay.style.display = "none";
        if (whitelistUnlockInputContainer) whitelistUnlockInputContainer.style.display = "none";
        updateStatus(false, isParentMode ? "Parent" : "Child");
        return;
      }

      // A child device has only one available action until the parent
      // password has been verified. Keep the sync form visible even if the
      // local lock password has not been configured yet.
      if (isChildMode && (!childSyncUnlocked || !childLinked || !childSyncCompletedAt)) {
        showSection(null);
        if (secWhitelist) secWhitelist.style.display = "none";
        if (secChangePassword) secChangePassword.style.display = "none";
        if (secPermanentFeedback) secPermanentFeedback.style.display = "none";
        if (parentControlPanel) parentControlPanel.style.display = "none";
        if (parentTimerPanel) parentTimerPanel.style.display = "none";
        if (parentSessionActivityPanel) parentSessionActivityPanel.style.display = "none";
        if (childSyncPanel) childSyncPanel.style.display = "block";
        stopLocalCountdown();
        if (whitelistLockOverlay) whitelistLockOverlay.style.display = "none";
        if (whitelistUnlockInputContainer) whitelistUnlockInputContainer.style.display = "none";
        updateStatus(false, "Child Sync");
        return;
      }

      // Active Session Check
      const now = Date.now();
      if (isParentMode) {
        chrome.storage.local.get(["showFeedbackPrompt", "feedbackPromptSessionId"], (feedbackState) => {
          if (feedbackState.showFeedbackPrompt && feedbackState.feedbackPromptSessionId) {
            showSection(secFeedback);
            if (secWhitelist) secWhitelist.style.display = parentFeaturesReady ? "block" : "none";
            if (secChangePassword) secChangePassword.style.display = "none";
            if (parentControlPanel) parentControlPanel.style.display = "none";
            if (parentTimerPanel) parentTimerPanel.style.display = "none";
            if (parentSessionActivityPanel) parentSessionActivityPanel.style.display = "none";
            updateStatus(false, "Feedback");
          } else {
            showSection(null);
            if (secSetupPassword) secSetupPassword.style.display = "none";
            if (secActiveSession) secActiveSession.style.display = "none";
            if (secIdleSession) secIdleSession.style.display = "none";
            if (secFeedback) secFeedback.style.display = "none";
            if (secWhitelist) secWhitelist.style.display = parentFeaturesReady ? "block" : "none";
            if (secChangePassword) secChangePassword.style.display = "none";
            if (parentControlPanel) parentControlPanel.style.display = hasSignedInAccount && (!childLinked || !childSyncCompletedAt || !hasParentPassword) ? "block" : "none";
            if (childSyncPanel) childSyncPanel.style.display = "none";
            if (parentTimerPanel) parentTimerPanel.style.display = hasSignedInAccount && childLinked && childSyncCompletedAt && hasParentPassword ? "block" : "none";
            updateParentTimerControls();
            updateStatus(false, "Parent");
          }
        });
        return;
      }

      if (state.isFocusActive && state.sessionEndTime > now) {
        showSection(secActiveSession);
        updateStatus(true, "Focusing");
        startLocalCountdown(state.sessionEndTime);
        
        // Handle Whitelist lock
        if (isWhitelistUnlocked) {
          whitelistLockOverlay.style.display = "none";
          whitelistUnlockInputContainer.style.display = "none";
        } else {
          whitelistLockOverlay.style.display = "flex";
          whitelistUnlockInputContainer.style.display = "none";
        }
      } else {
        // Idle
        chrome.storage.local.get("showFeedbackPrompt", (res) => {
          chrome.storage.local.get("feedbackPromptSessionId", (promptState) => {
            const hasCompletedSessionPrompt = res.showFeedbackPrompt && !!promptState.feedbackPromptSessionId && !isChildMode;

            if (hasCompletedSessionPrompt) {
              showSection(secFeedback);
              updateStatus(false, "Feedback");
              secWhitelist.style.display = "none"; // Hide whitelist during feedback
              secChangePassword.style.display = "none";
            } else {
              // Ignore stale prompt flags from before completed sessions were tracked.
              if (res.showFeedbackPrompt) {
                chrome.storage.local.set({ showFeedbackPrompt: false });
              }
              showSection(secIdleSession);
              updateStatus(false, "Idle");
              secWhitelist.style.display = isChildMode ? (childSyncReady ? "block" : "none") : "block";
              secChangePassword.style.display = "none";
            }
          });
        });
        stopLocalCountdown();
        
        // Whitelist is completely unlocked in idle mode
        whitelistLockOverlay.style.display = "none";
        whitelistUnlockInputContainer.style.display = "none";
      }
    });
  }

  function updateFocusModeHelp() {
    if (!focusModeHelp || !focusModeSelect) return;

    if (modeLocked) {
      focusModeHelp.textContent = "Focus mode is locked after child sync on this device.";
      return;
    }

    const helpByMode = {
      self: "Self mode is for personal use and keeps the current behavior.",
      parent: "Parent mode lets a parent manage the session password and controls.",
      child: "Child mode is for the supervised user who enters the password set by the parent."
    };

    focusModeHelp.textContent = helpByMode[focusModeSelect.value] || helpByMode.self;
  }

  function updateParentTimerControls() {
    const canStartParentSession = focusMode === "parent" && !!(accountToken && accountUser) && !!childLinked && !!childSyncCompletedAt && hasParentPassword;
    if (parentLinkNote) {
      if (canStartParentSession) {
        parentLinkNote.style.display = "none";
      } else {
        parentLinkNote.textContent = !childLinked
          ? "Link a child first by completing child sync before starting a session."
          : "Set a parent password before starting a child session.";
        parentLinkNote.style.display = "block";
      }
    }
    if (btnParentStartFocus) {
      btnParentStartFocus.disabled = !canStartParentSession;
      btnParentStartFocus.title = canStartParentSession
        ? "Start the child focus session"
        : !childLinked ? "Complete child sync before starting a session" : "Set a parent password before starting a session";
    }
    parentPresetBtns.forEach((button) => {
      button.disabled = !canStartParentSession;
    });
    if (parentCustomMinutesInput) parentCustomMinutesInput.disabled = !canStartParentSession;
    if (btnParentSetCustom) btnParentSetCustom.disabled = !canStartParentSession;
  }

  function updateParentStopControls(isActive) {
    if (parentStopControls) {
      parentStopControls.style.display = isActive ? "flex" : "none";
    }
    if (btnParentResetSync) {
      btnParentResetSync.disabled = isActive;
      btnParentResetSync.title = isActive
        ? "Stop the active child session before resetting sync."
        : "Clear the saved child link so Child Sync can be completed again.";
    }
    if (!isActive && parentStopPassword) {
      parentStopPassword.value = "";
    }
  }

  if (focusModeSelect) {
    focusModeSelect.value = focusMode;
    updateFocusModeHelp();
    focusModeSelect.addEventListener("change", () => {
      if (modeLocked) {
        focusModeSelect.value = focusMode;
        updateFocusModeHelp();
        return;
      }

      focusMode = focusModeSelect.value;
      updateFocusModeHelp();
      chrome.runtime.sendMessage({
        type: "SET_FOCUS_MODE",
        focusMode
      }, () => {
        refreshState();
      });
      const accountRequired = (focusMode === "parent" || focusMode === "child") && !(accountToken && accountUser);
      if (accountModeNote) {
        accountModeNote.style.display = accountRequired ? "block" : "none";
      }
      if (secPermanentFeedback) {
        secPermanentFeedback.style.display = accountRequired || focusMode === "child" ? "none" : "block";
      }
      if (accountRequired) {
        showSection(null);
        if (secWhitelist) secWhitelist.style.display = "none";
        if (secChangePassword) secChangePassword.style.display = "none";
        if (parentControlPanel) parentControlPanel.style.display = "none";
        if (childSyncPanel) childSyncPanel.style.display = "none";
        if (parentTimerPanel) parentTimerPanel.style.display = "none";
        if (parentSessionActivityPanel) parentSessionActivityPanel.style.display = "none";
        stopLocalCountdown();
        if (whitelistLockOverlay) whitelistLockOverlay.style.display = "none";
        if (whitelistUnlockInputContainer) whitelistUnlockInputContainer.style.display = "none";
        updateStatus(false, focusMode === "parent" ? "Parent" : "Child");
        return;
      }
      if (parentControlPanel) {
        parentControlPanel.style.display = focusMode === "parent" && (!childLinked || !childSyncCompletedAt || !hasParentPassword) ? "block" : "none";
      }
      if (childSyncPanel) {
        childSyncPanel.style.display = focusMode === "child" && (!childSyncUnlocked || !childLinked || !childSyncCompletedAt) && !!(accountToken && accountUser) ? "block" : "none";
      }
      if (parentTimerPanel) {
        parentTimerPanel.style.display = focusMode === "parent" && !!(accountToken && accountUser) && childLinked && childSyncCompletedAt && hasParentPassword ? "block" : "none";
      }
      updateParentTimerControls();
    });
  }

  if (childSyncForm) {
    childSyncForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const enteredPassword = childSyncPassword ? childSyncPassword.value : "";

      if (focusMode !== "child") {
        showError(childSyncError, "Switch to child mode first.");
        return;
      }
      if (!enteredPassword) {
        showError(childSyncError, "Enter the parent password.");
        return;
      }

      if (!accountToken) {
        showError(childSyncError, "Sign in with the same Google account used in Parent mode.");
        return;
      }

      try {
        const profileResponse = await fetch(backendPath("/api/auth/profile"), {
          headers: { Authorization: `Bearer ${accountToken}` }
        });
        const profileData = await profileResponse.json().catch(() => ({}));
        if (!profileResponse.ok) {
          if (profileResponse.status === 401) {
            accountToken = null;
            accountUser = null;
            await chrome.storage.local.remove(["accountToken", "accountUser"]);
            renderAccount();
          }
          throw new Error(profileData.error || "Could not refresh synced progress. Sign in again and retry.");
        }
        if (profileData.user) {
          accountUser = profileData.user;
          await chrome.storage.local.set({ accountUser });
        }
        const syncedProgress = profileData.progress && typeof profileData.progress === "object"
          ? profileData.progress
          : {};
        const syncedParentPassword = typeof syncedProgress.parentPassword === "string"
          ? syncedProgress.parentPassword
          : "";
        const syncedParentEmail = typeof syncedProgress.parentEmail === "string"
          ? syncedProgress.parentEmail.trim().toLowerCase()
          : "";
        await restoreProgress(syncedProgress);
        await chrome.storage.local.set({
          parentPassword: syncedParentPassword,
          parentEmail: syncedParentEmail
        });
        parentPassword = syncedParentPassword;
        hasParentPassword = Boolean(syncedParentPassword);
        if (!syncedParentPassword) {
          showError(
            childSyncError,
            "No parent password is saved to this Google account. Save it in Parent mode using the same Google account, then retry."
          );
          return;
        }
      } catch (error) {
        showError(childSyncError, error.message || "Could not refresh synced progress.");
        return;
      }

      chrome.runtime.sendMessage({
        type: "VERIFY_PARENT_PASSWORD",
        parentPassword: enteredPassword
      }, async (response) => {
        if (response && response.success) {
          childSyncUnlocked = true;
          modeLocked = true;
          childLinked = true;
          childSyncCompletedAt = Date.now();
          if (childSyncPassword) childSyncPassword.value = "";
          childSyncError.style.display = "none";
          if (childSyncSuccess) {
            childSyncSuccess.style.display = "block";
            setTimeout(() => childSyncSuccess.style.display = "none", 2500);
          }
          if (childSyncPanel) childSyncPanel.style.display = "none";
          if (focusModeSelect) {
            focusModeSelect.disabled = true;
          }
          await chrome.storage.local.set({
            modeLocked: true,
            childLinked: true,
            childSyncUnlocked: true,
            childSyncCompletedAt
          });
          updateFocusModeHelp();
          renderAccount();
          await syncProgress();
          refreshState();
        } else {
          showError(childSyncError, response.error || "Incorrect parent password.");
        }
      });
    });
  }

  function showSection(sectionToShow) {
    [secSetupPassword, secActiveSession, secIdleSession, secFeedback].forEach((sec) => {
      if (!sec) return;
      sec.style.display = sectionToShow && sec === sectionToShow ? "block" : "none";
    });
  }

  function updateStatus(isActive, text) {
    if (isActive) {
      statusDot.className = "status-dot active";
      statusLabel.textContent = text;
    } else {
      statusDot.className = "status-dot";
      statusLabel.textContent = text;
    }
  }

  // --- PASSWORD SETUP ---
  passwordSetupForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const newPass = newPasswordInput.value;
    const confirmPass = confirmPasswordInput.value;

    if (newPass !== confirmPass) {
      showError(passwordSetupError, "Passwords do not match.");
      return;
    }

    if (newPass.length < 4) {
      showError(passwordSetupError, "Password must be at least 4 characters.");
      return;
    }

    chrome.runtime.sendMessage({
      type: "SET_PASSWORD",
      password: newPass,
      focusMode: focusModeSelect ? focusModeSelect.value : focusMode
    }, (response) => {
      if (response && response.success) {
        newPasswordInput.value = "";
        confirmPasswordInput.value = "";
        passwordSetupError.style.display = "none";
        syncProgress();
        refreshState();
      } else {
        showError(passwordSetupError, response.error || "Failed to set password.");
      }
    });
  });

  if (parentPasswordForm) {
    parentPasswordForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const parentPass = parentPasswordInput ? parentPasswordInput.value : "";
      const confirmPass = parentPasswordConfirm ? parentPasswordConfirm.value : "";

      if (focusMode !== "parent") {
        showError(parentPasswordError, "Select parent mode first.");
        return;
      }
      if (parentPass !== confirmPass) {
        showError(parentPasswordError, "Parent passwords do not match.");
        return;
      }

      if (parentPass.length < 4) {
        showError(parentPasswordError, "Parent password must be at least 4 characters.");
        return;
      }

      chrome.runtime.sendMessage({
        type: "SET_PARENT_PASSWORD",
        parentPassword: parentPass,
        focusMode,
        parentEmail: accountUser && accountUser.email ? accountUser.email : ""
      }, async (response) => {
        if (response && response.success) {
          parentPassword = parentPass;
          hasParentPassword = true;
          updateParentTimerControls();
          const syncResult = await syncProgress();
          if (parentPasswordInput) parentPasswordInput.value = "";
          if (parentPasswordConfirm) parentPasswordConfirm.value = "";
          parentPasswordError.style.display = "none";
          if (!syncResult.success) {
            showError(parentPasswordError, `Parent password saved locally, but could not sync: ${syncResult.error}`);
            return;
          }
          refreshState();
          if (parentPasswordSuccess) {
            parentPasswordSuccess.style.display = "block";
            setTimeout(() => parentPasswordSuccess.style.display = "none", 2500);
          }
          syncProgress();
        } else {
          showError(parentPasswordError, response.error || "Failed to save parent password.");
        }
      });
    });
  }

  // --- TIMER PRESENTATION ---
  parentPresetBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      parentPresetBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      parentDurationSeconds = parseInt(btn.dataset.seconds, 10);
      if (parentCustomMinutesInput) {
        parentCustomMinutesInput.value = Math.round(parentDurationSeconds / 60);
      }
    });
  });

  if (btnParentSetCustom) {
    btnParentSetCustom.addEventListener("click", () => {
      const mins = parseInt(parentCustomMinutesInput ? parentCustomMinutesInput.value : "25", 10);
      if (isNaN(mins) || mins < 1) {
        if (parentCustomMinutesInput) parentCustomMinutesInput.value = 1;
        parentDurationSeconds = 60;
      } else if (mins > 720) {
        if (parentCustomMinutesInput) parentCustomMinutesInput.value = 720;
        parentDurationSeconds = 720 * 60;
      } else {
        parentDurationSeconds = mins * 60;
      }
      parentPresetBtns.forEach(b => b.classList.remove("active"));
    });
  }

  presetBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      if (focusMode === "parent" || (focusMode === "child" && (!childSyncUnlocked || !childLinked || !childSyncCompletedAt))) return;
      presetBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      activeDurationSeconds = parseInt(btn.dataset.seconds, 10);
      
      // Update custom input display to match preset
      customMinutesInput.value = Math.round(activeDurationSeconds / 60);
    });
  });

  btnSetCustom.addEventListener("click", () => {
    if (focusMode === "parent" || (focusMode === "child" && (!childSyncUnlocked || !childLinked || !childSyncCompletedAt))) return;
    const mins = parseInt(customMinutesInput.value, 10);
    if (isNaN(mins) || mins < 1) {
      customMinutesInput.value = 1;
      activeDurationSeconds = 60;
    } else if (mins > 720) {
      customMinutesInput.value = 720;
      activeDurationSeconds = 720 * 60;
    } else {
      activeDurationSeconds = mins * 60;
    }
    
    // Deactivate all preset buttons
    presetBtns.forEach(b => b.classList.remove("active"));
  });

  // Start focus session
  btnStartFocus.addEventListener("click", () => {
    if (focusMode === "parent" || (focusMode === "child" && (!childSyncUnlocked || !childLinked || !childSyncCompletedAt))) {
      if (focusMode === "child") {
        alert("Complete Child Sync before setting a focus timer.");
      }
      return;
    }
    const sessionPassword = selfSessionPassword ? selfSessionPassword.value : "";
    const sessionPasswordConfirm = selfSessionPasswordConfirm ? selfSessionPasswordConfirm.value : "";
    if (focusMode === "self" && (sessionPassword.length < 4 || sessionPassword !== sessionPasswordConfirm)) {
      alert(sessionPassword.length < 4 ? "Create a temporary password with at least 4 characters." : "Temporary passwords do not match.");
      return;
    }
    chrome.runtime.sendMessage({
      type: "START_SESSION",
      durationSeconds: activeDurationSeconds,
      allowedUrls: currentAllowedUrls,
      sessionPassword: focusMode === "self" ? sessionPassword : undefined
    }, (response) => {
      if (response && response.success) {
        if (selfSessionPassword) selfSessionPassword.value = "";
        if (selfSessionPasswordConfirm) selfSessionPasswordConfirm.value = "";
        refreshState();
      } else {
        alert(response.error || "Could not start session.");
      }
    });
  });

  function updateChildTimerControls() {
    const timerEnabled = focusMode !== "child" || (childSyncUnlocked && childLinked && childSyncCompletedAt);
    presetBtns.forEach(button => {
      button.disabled = !timerEnabled;
    });
    if (btnSetCustom) btnSetCustom.disabled = !timerEnabled;
    if (customMinutesInput) customMinutesInput.disabled = !timerEnabled;
    if (btnStartFocus) btnStartFocus.disabled = !timerEnabled;
    if (selfSessionPassword) selfSessionPassword.disabled = !timerEnabled;
    if (selfSessionPasswordConfirm) selfSessionPasswordConfirm.disabled = !timerEnabled;
  }

  if (btnParentStartFocus) {
    btnParentStartFocus.addEventListener("click", () => {
      if (focusMode !== "parent") return;
      if (!childLinked || !childSyncCompletedAt) {
        alert("Link a child first by completing child sync before starting a parent session.");
        return;
      }
      const sessionPassword = parentSessionPassword ? parentSessionPassword.value : "";
      const sessionPasswordConfirm = parentSessionPasswordConfirm ? parentSessionPasswordConfirm.value : "";
      if (sessionPassword.length < 4 || sessionPassword !== sessionPasswordConfirm) {
        alert(sessionPassword.length < 4 ? "Create a temporary session password with at least 4 characters." : "Temporary passwords do not match.");
        return;
      }
      chrome.runtime.sendMessage({
        type: "START_SESSION",
        durationSeconds: parentDurationSeconds,
        allowedUrls: currentAllowedUrls,
        sessionPassword
      }, (response) => {
        if (response && response.success) {
          if (parentSessionPassword) parentSessionPassword.value = "";
          if (parentSessionPasswordConfirm) parentSessionPasswordConfirm.value = "";
          refreshState();
          refreshSessionActivity();
        } else {
          alert(response.error || "Could not start child session.");
        }
      });
    });
  }

  // Stop session (Unlock)
  btnUnlock.addEventListener("click", () => {
    if (focusMode === "child") {
      return;
    }
    const password = unlockPasswordInput.value;
    if (!password) {
      showError(unlockError, "Password required.");
      return;
    }

    chrome.runtime.sendMessage({
      type: "STOP_SESSION",
      password: password
    }, (response) => {
      if (response && response.success) {
        unlockPasswordInput.value = "";
        unlockError.style.display = "none";
        isWhitelistUnlocked = false; // Reset lock
        refreshState();
      } else {
        showError(unlockError, response.error || "Verification failed.");
      }
    });
  });

  // --- TIMER DISPLAY LOCAL LOOP ---
  function startLocalCountdown(endTime) {
    stopLocalCountdown();
    
    function updateTimer() {
      const remainingMs = endTime - Date.now();
      if (remainingMs <= 0) {
        stopLocalCountdown();
        refreshState();
        return;
      }
      
      const totalSeconds = Math.ceil(remainingMs / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      
      countdownText.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    updateTimer();
    countdownInterval = setInterval(updateTimer, 1000);
  }

  function stopLocalCountdown() {
    if (countdownInterval) {
      clearInterval(countdownInterval);
      countdownInterval = null;
    }
  }

  // --- WHITELIST MANAGEMENT ---
  function renderWhitelist(urls) {
    whitelistList.innerHTML = "";
    if (urls.length === 0) {
      const emptyLi = document.createElement("li");
      emptyLi.className = "site-item";
      emptyLi.style.justifyContent = "center";
      emptyLi.style.color = "var(--text-muted)";
      emptyLi.textContent = "No whitelisted sites. All blocked.";
      whitelistList.appendChild(emptyLi);
      
      // Update history list rendering as well
      renderHistory();
      return;
    }

    urls.forEach((url, index) => {
      const li = document.createElement("li");
      li.className = "site-item";
      
      const span = document.createElement("span");
      span.className = "site-url";
      span.textContent = url;
      span.title = url;

      const deleteBtn = document.createElement("button");
      deleteBtn.className = "delete-btn";
      deleteBtn.style.display = focusMode === "child" ? "none" : "";
      deleteBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        </svg>
      `;
      deleteBtn.addEventListener("click", () => {
        deleteWhitelistItem(index);
      });

      li.appendChild(span);
      li.appendChild(deleteBtn);
      whitelistList.appendChild(li);
    });

    // Update history list rendering to reflect currently whitelisted domains
    renderHistory();
  }

  // Add site
  btnAddSite.addEventListener("click", () => {
    if (focusMode === "child") return;
    addWhitelistItem();
  });

  newSiteInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      addWhitelistItem();
    }
  });

  async function addWhitelistItem() {
    if (focusMode === "child") return;
    let inputVal = newSiteInput.value.trim().toLowerCase();
    if (!inputVal) return;

    // Standardize URL input: remove http:// or https:// and leading www.
    inputVal = inputVal.replace(/^(https?:\/\/)?(www\.)?/, "");
    
    if (inputVal === "") return;

    if (!inputVal.includes(".")) {
      showError(whitelistActionError, "Enter a valid domain name (e.g. youtube.com).");
      return;
    }

    if (currentAllowedUrls.includes(inputVal)) {
      showError(whitelistActionError, "Domain already in whitelist.");
      return;
    }

    // Prepare list
    const updatedUrls = [...currentAllowedUrls, inputVal];
    const group = newSiteCategorySelect?.value || getHistoryGroup(inputVal);
    saveWhitelist(updatedUrls, { groupByDomain: { [inputVal]: group } });
  }

  function deleteWhitelistItem(index) {
    if (focusMode === "child") return;
    const updatedUrls = [...currentAllowedUrls];
    updatedUrls.splice(index, 1);
    saveWhitelist(updatedUrls);
  }

  function saveWhitelist(updatedUrls, options = {}) {
    if (focusMode === "child") return;
    // If active and whitelisted is locked, we need the password, but we've already checked isWhitelistUnlocked in the popup.
    // So we pass the unlock password if we verified it, or nothing if idle.
    const password = isWhitelistUnlocked ? whitelistUnlockPassword.value : "";
    
    chrome.runtime.sendMessage({
      type: "UPDATE_WHITELIST",
      allowedUrls: updatedUrls,
      password: password
    }, async (response) => {
      if (response && response.success) {
        const addedItems = updatedUrls.filter(domain => !currentAllowedUrls.includes(domain));
        for (const domain of addedItems) {
          await addToWhitelistHistory(domain, options.groupByDomain?.[domain]);
        }

        newSiteInput.value = "";
        whitelistActionError.style.display = "none";
        currentAllowedUrls = updatedUrls;
        renderWhitelist(currentAllowedUrls);
        syncProgress();
      } else {
        showError(whitelistActionError, response.error || "Failed to update whitelist.");
      }
    });
  }

  // --- WHITELIST HISTORY & SEARCH ---
  const historyList = document.getElementById("history-list");
  const historySearch = document.getElementById("history-search");
  let historyRenderVersion = 0;

  function normalizeHistoryDomain(domain) {
    return String(domain || "").trim().toLowerCase().replace(/^www\./, "");
  }

  function getActivityCategory(domain) {
    const rawValue = String(domain || "").trim().toLowerCase();
    let parsedUrl;
    try {
      parsedUrl = new URL(rawValue.includes("://") ? rawValue : `https://${rawValue}`);
    } catch (error) {
      return "Other Websites";
    }
    const hostname = normalizeHistoryDomain(parsedUrl.hostname);
    const pathname = parsedUrl.pathname || "/";
    const pathMatch = ACTIVITY_CATEGORY_PATHS.find(rule =>
      (hostname === rule.host || hostname.endsWith(`.${rule.host}`)) && rule.path.test(pathname)
    );
    if (pathMatch) return pathMatch.category;

    let bestMatch = null;

    Object.entries(ACTIVITY_CATEGORY_DOMAINS).forEach(([category, domains]) => {
      domains.forEach(categoryDomain => {
        if (
          (hostname === categoryDomain || hostname.endsWith(`.${categoryDomain}`)) &&
          (!bestMatch || categoryDomain.length > bestMatch.domain.length)
        ) {
          bestMatch = { category, domain: categoryDomain };
        }
      });
    });

    return bestMatch ? bestMatch.category : "Other Websites";
  }

  function getHistoryGroup(domain, savedGroup) {
    if (historyGroups.includes(savedGroup)) return savedGroup;

    const hostname = normalizeHistoryDomain(domain);
    for (const group of HISTORY_GROUPS) {
      if (HISTORY_GROUP_DOMAINS[group].some(groupDomain =>
        hostname === groupDomain || hostname.endsWith(`.${groupDomain}`)
      )) {
        return group;
      }
    }

    return historyGroups[0] || "Personal";
  }

  if (btnParentStopFocus) {
    btnParentStopFocus.addEventListener("click", () => {
      if (focusMode !== "parent") return;
      const password = parentStopPassword ? parentStopPassword.value : "";
      if (!password) {
        showError(parentStopError, "Temporary session password required.");
        return;
      }
      chrome.runtime.sendMessage({ type: "STOP_SESSION", password }, (response) => {
        if (response && response.success) {
          if (parentStopPassword) parentStopPassword.value = "";
          if (parentStopError) parentStopError.style.display = "none";
          refreshState();
          refreshSessionActivity();
        } else {
          showError(parentStopError, response?.error || "Could not stop child session.");
        }
      });
    });
  }

  if (btnParentResetSync) {
    btnParentResetSync.addEventListener("click", () => {
      if (focusMode !== "parent") return;
      if (!window.confirm("Reset Child Sync? The child will need to sign in and enter the parent sync password again.")) return;
      if (parentResetSyncError) parentResetSyncError.style.display = "none";
      btnParentResetSync.disabled = true;
      chrome.runtime.sendMessage({ type: "RESET_CHILD_SYNC" }, (response) => {
        if (response?.success) {
          childLinked = false;
          childSyncCompletedAt = 0;
          refreshState();
          refreshSessionActivity();
        } else {
          if (parentResetSyncError) {
            parentResetSyncError.textContent = response?.error || "Could not reset Child Sync.";
            parentResetSyncError.style.display = "block";
          }
          updateParentStopControls(latestSessionActivityIsActive);
        }
      });
    });
  }

  if (historySearch) {
    historySearch.addEventListener("input", (e) => {
      renderHistory(e.target.value.trim());
    });
  }

  async function addToWhitelistHistory(domain, selectedGroup) {
    const result = await chrome.storage.local.get("whitelistHistory");
    let history = result.whitelistHistory || [];
    
    // Remove domain if it already exists to move it to the top (newest first)
    history = history.filter(item => item.domain !== domain);
    
    // Unshift new entry
    history.unshift({
      domain: domain,
      timestamp: Date.now(),
      group: historyGroups.includes(selectedGroup) ? selectedGroup : getHistoryGroup(domain)
    });
    
    // Limit to last 50 items
    if (history.length > 50) {
      history = history.slice(0, 50);
    }
    
    await chrome.storage.local.set({ whitelistHistory: history });
    renderHistory(historySearch ? historySearch.value.trim() : "");
  }

  async function addSiteDirectly(domain, group) {
    const normalizedDomain = String(domain || "").trim().toLowerCase().replace(/^www\./, "");
    if (!normalizedDomain) return;

    if (currentAllowedUrls.includes(normalizedDomain)) {
      showError(whitelistActionError, "Domain already in whitelist.");
      return;
    }
    const updatedUrls = [...currentAllowedUrls, normalizedDomain];
    saveWhitelist(updatedUrls, { groupByDomain: { [normalizedDomain]: group } });
  }

  let automaticAllowedDomainsCache = null;

  function getAutomaticAllowedDomains() {
    if (automaticAllowedDomainsCache) return Promise.resolve(automaticAllowedDomainsCache);
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ type: "GET_AUTOMATIC_ALLOWED_DOMAINS" }, (response) => {
        if (chrome.runtime.lastError || !response?.success || !Array.isArray(response.domains)) {
          reject(new Error("Could not load the automatically allowed sites."));
          return;
        }
        automaticAllowedDomainsCache = response.domains.map(normalizeHistoryDomain);
        resolve(automaticAllowedDomainsCache);
      });
    });
  }

  async function addCategoryToWhitelist(group, previousSites) {
    if (focusMode === "child") return;
    const categorySites = Array.isArray(HISTORY_GROUP_DOMAINS[group]) ? HISTORY_GROUP_DOMAINS[group] : [];
    const previousCategorySites = previousSites.map(item => item.domain);
    let automaticAllowedDomains;
    try {
      automaticAllowedDomains = await getAutomaticAllowedDomains();
    } catch (error) {
      showError(whitelistActionError, error.message);
      return;
    }
    const isAutomaticallyAllowed = (domain) => automaticAllowedDomains.some(allowedDomain =>
      domain === allowedDomain || domain.endsWith(`.${allowedDomain}`)
    );
    const additions = [...new Set([...categorySites, ...previousCategorySites].map(normalizeHistoryDomain))]
      .filter(domain => domain && !currentAllowedUrls.includes(domain) && !isAutomaticallyAllowed(domain));
    if (!additions.length) {
      showError(whitelistActionError, `All non-automatic sites in ${group} are already whitelisted.`);
      return;
    }
    const updatedUrls = [...currentAllowedUrls, ...additions];
    const groupByDomain = Object.fromEntries(additions.map(domain => [domain, group]));
    saveWhitelist(updatedUrls, { groupByDomain });
  }

  async function updateHistoryGroup(domain, group) {
    if (!historyGroups.includes(group)) return;

    const result = await chrome.storage.local.get("whitelistHistory");
    const history = result.whitelistHistory || [];
    const item = history.find(entry => entry.domain === domain);
    if (!item) return;

    item.group = group;
    await chrome.storage.local.set({ whitelistHistory: history });
    renderHistory(historySearch ? historySearch.value.trim() : "");
  }

  async function renderHistory(filterText = "") {
    if (!historyList) return;
    const renderVersion = ++historyRenderVersion;

    const groupState = await chrome.storage.local.get("historyGroups");
    if (renderVersion !== historyRenderVersion) return;
    const savedGroups = Array.isArray(groupState.historyGroups)
      ? groupState.historyGroups.filter(group => typeof group === "string" && group.trim()).slice(0, 30)
      : [];
    historyGroups = [...new Set([...HISTORY_GROUPS, ...savedGroups])];
    if (newSiteCategorySelect) {
      const previousSelection = historyGroups.includes(newSiteCategorySelect.value)
        ? newSiteCategorySelect.value
        : getHistoryGroup(newSiteInput?.value || "");
      newSiteCategorySelect.innerHTML = "";
      historyGroups.forEach((group) => {
        const option = document.createElement("option");
        option.value = group;
        option.textContent = group;
        newSiteCategorySelect.appendChild(option);
      });
      newSiteCategorySelect.value = previousSelection;
    }

    const result = await chrome.storage.local.get("whitelistHistory");
    if (renderVersion !== historyRenderVersion) return;
    let history = result.whitelistHistory || [];

    // Keep one history entry per domain, preserving the newest entry.
    const originalHistoryLength = history.length;
    const seenDomains = new Set();
    history = history.filter(item => {
      const domain = String(item.domain || "").trim().toLowerCase();
      if (!domain || seenDomains.has(domain)) return false;
      seenDomains.add(domain);
      return true;
    });
    if (history.length !== originalHistoryLength) {
      await chrome.storage.local.set({ whitelistHistory: history });
      if (renderVersion !== historyRenderVersion) return;
    }

    // Backfill sites that were whitelisted before history tracking was added.
    const knownDomains = new Set(history.map(item => item.domain));
    const missingCurrentSites = currentAllowedUrls
      .filter(domain => !knownDomains.has(domain))
      .map(domain => ({
        domain,
        timestamp: Date.now(),
        group: getHistoryGroup(domain)
      }));

    if (missingCurrentSites.length > 0) {
      history = [...missingCurrentSites, ...history];
      await chrome.storage.local.set({ whitelistHistory: history });
    }

    // Previously allowed means sites that are no longer on the active whitelist.
    const currentDomains = new Set(currentAllowedUrls.map(domain => domain.toLowerCase()));
    let filteredHistory = history.filter(item =>
      !currentDomains.has(String(item.domain || "").toLowerCase())
    );

    // Filter by search text if any
    if (filterText) {
      const lowerFilter = filterText.toLowerCase();
      filteredHistory = filteredHistory.filter(item => item.domain.includes(lowerFilter));
    }

    if (renderVersion !== historyRenderVersion) return;
    historyList.innerHTML = "";

    const groupedHistory = historyGroups.map(group => ({
      group,
      items: filteredHistory.filter(item => getHistoryGroup(item.domain, item.group) === group)
    })).filter(section => section.items.length > 0 || Array.isArray(HISTORY_GROUP_DOMAINS[section.group]));

    groupedHistory.forEach(({ group, items }) => {
      const groupHeader = document.createElement("li");
      groupHeader.className = "history-group-header";
      const groupName = document.createElement("span");
      groupName.textContent = group;
      const addAllButton = document.createElement("button");
      addAllButton.type = "button";
      addAllButton.className = "btn-add-history history-group-add-btn";
      addAllButton.textContent = "Add all";
      addAllButton.setAttribute("aria-label", `Add all ${group} sites to whitelist`);
      addAllButton.addEventListener("click", () => addCategoryToWhitelist(group, items));
      groupHeader.append(groupName, addAllButton);
      historyList.appendChild(groupHeader);

      if (!items.length && filteredHistory.length === 0 && group === HISTORY_GROUPS[0]) {
        const emptyLi = document.createElement("li");
        emptyLi.className = "site-item";
        emptyLi.style.justifyContent = "center";
        emptyLi.style.color = "var(--text-muted)";
        emptyLi.style.fontSize = "11px";
        emptyLi.textContent = filterText ? "No matching history." : "No previous history. Use Add all to whitelist this category.";
        historyList.appendChild(emptyLi);
      }

      items.forEach(item => {
        const li = document.createElement("li");
        li.className = "site-item";

        const span = document.createElement("span");
        span.className = "site-domain";
        span.textContent = item.domain;
        span.title = item.domain;

        const actions = document.createElement("div");
        actions.className = "history-item-actions";

        const groupSelect = document.createElement("select");
        groupSelect.className = "history-group-select";
        groupSelect.setAttribute("aria-label", `Group for ${item.domain}`);
        historyGroups.forEach(optionGroup => {
          const option = document.createElement("option");
          option.value = optionGroup;
          option.textContent = optionGroup;
          option.selected = optionGroup === getHistoryGroup(item.domain, item.group);
          groupSelect.appendChild(option);
        });
        const createOption = document.createElement("option");
        createOption.value = CREATE_GROUP_OPTION;
        createOption.textContent = "Create New Group";
        groupSelect.appendChild(createOption);
        groupSelect.addEventListener("change", () => {
          if (groupSelect.value === CREATE_GROUP_OPTION) {
            const name = prompt("Enter a name for the new group:", "New Group");
            const cleanName = typeof name === "string" ? name.trim().slice(0, 32) : "";
            if (!cleanName || historyGroups.includes(cleanName)) {
              groupSelect.value = getHistoryGroup(item.domain, item.group);
              return;
            }
            historyGroups.push(cleanName);
            item.group = cleanName;
            chrome.storage.local.set({ historyGroups });
            updateHistoryGroup(item.domain, cleanName);
            return;
          }
          item.group = groupSelect.value;
          updateHistoryGroup(item.domain, groupSelect.value);
        });

        const addBtn = document.createElement("button");
        addBtn.className = "btn-add-history";
        addBtn.textContent = "Add";
        addBtn.addEventListener("click", () => {
          addSiteDirectly(item.domain, item.group);
        });

        actions.appendChild(groupSelect);
        actions.appendChild(addBtn);
        li.appendChild(span);
        li.appendChild(actions);
        historyList.appendChild(li);
      });
    });
  }

  const sessionActivityColors = [
    "#f7b928",
    "#4dd8ff",
    "#b779ff",
    "#57e389",
    "#ff7f66",
    "#ff65b3",
    "#8d9eff"
  ];

  function formatActivityDuration(milliseconds) {
    const totalSeconds = Math.max(1, Math.round(Number(milliseconds) / 1000));
    if (totalSeconds < 60) return `${totalSeconds}s`;

    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
  }

  function renderActivityChart(pie, legend, label, activity, isActive, parentView = false, excludeBlocked = false, categoryView = false) {
    if (!pie || !legend) return;

    const entries = Object.entries(activity || {})
      .map(([domain, milliseconds]) => ({
        blocked: domain.startsWith("blocked:"),
        domain: domain.startsWith("blocked:") ? `Blocked: ${domain.slice(8)}` : domain,
        milliseconds: Number(milliseconds)
      }))
      .filter(item => item.domain && Number.isFinite(item.milliseconds) && item.milliseconds > 0 && (!excludeBlocked || !item.blocked))
      .sort((a, b) => b.milliseconds - a.milliseconds);

    const totalMilliseconds = entries.reduce((total, item) => total + item.milliseconds, 0);
    if (label) {
      label.textContent = isActive
        ? (parentView ? "Current child session" : "Current focus session")
        : (parentView ? "Last child session" : "Last focus session");
    }

    if (!totalMilliseconds) {
      pie.style.background = "var(--bg-dark-3)";
      const emptyLabel = categoryView
        ? (parentView ? "No child website category activity recorded yet" : "No website category activity recorded yet")
        : (parentView ? "No child website activity recorded yet" : "No website activity recorded yet");
      pie.setAttribute("aria-label", emptyLabel);
      legend.innerHTML = `<div class="session-activity-empty">${emptyLabel}.</div>`;
      return;
    }

    const visibleEntries = entries.slice(0, 6);
    if (entries.length > visibleEntries.length) {
      visibleEntries.push({
        domain: "Other sites",
        milliseconds: entries.slice(6).reduce((total, item) => total + item.milliseconds, 0)
      });
    }

    let currentDegree = 0;
    const gradientSegments = [];
    const ariaParts = [];
    visibleEntries.forEach((item, index) => {
      const nextDegree = currentDegree + (item.milliseconds / totalMilliseconds) * 360;
      const color = sessionActivityColors[index % sessionActivityColors.length];
      gradientSegments.push(`${color} ${currentDegree}deg ${nextDegree}deg`);
      ariaParts.push(`${item.domain}: ${formatActivityDuration(item.milliseconds)}`);
      currentDegree = nextDegree;
    });

    pie.style.background = `conic-gradient(${gradientSegments.join(", ")})`;
    pie.setAttribute("aria-label", ariaParts.join(", "));
    legend.innerHTML = "";

    visibleEntries.forEach((item, index) => {
      const row = document.createElement("div");
      row.className = "session-activity-legend-row";

      const swatch = document.createElement("span");
      swatch.className = "session-activity-swatch";
      swatch.style.backgroundColor = sessionActivityColors[index % sessionActivityColors.length];

      const domain = document.createElement("span");
      domain.className = "session-activity-domain";
      domain.textContent = item.domain;
      domain.title = item.domain;

      const duration = document.createElement("span");
      duration.className = "session-activity-duration";
      duration.textContent = formatActivityDuration(item.milliseconds);

      row.appendChild(swatch);
      row.appendChild(domain);
      row.appendChild(duration);
      legend.appendChild(row);
    });
  }

  function buildGroupActivity(activity) {
    return Object.entries(activity || {}).reduce((groupActivity, [domain, milliseconds]) => {
      if (domain.startsWith("blocked:")) return groupActivity;
      const duration = Number(milliseconds);
      if (!Number.isFinite(duration) || duration <= 0) return groupActivity;
      const group = getActivityCategory(domain);
      groupActivity[group] = (Number(groupActivity[group]) || 0) + duration;
      return groupActivity;
    }, {});
  }

  function renderBlockedSiteActivity(list, activity) {
    if (!list) return;
    const entries = Object.entries(activity || {})
      .filter(([domain, milliseconds]) => domain.startsWith("blocked:") && Number(milliseconds) > 0)
      .map(([domain]) => domain.slice(8))
      .sort((a, b) => a.localeCompare(b));

    list.innerHTML = "";
    if (entries.length === 0) {
      const emptyItem = document.createElement("li");
      emptyItem.className = "session-activity-empty";
      emptyItem.textContent = "No blocked sites visited.";
      list.appendChild(emptyItem);
      return;
    }

    entries.forEach(item => {
      const row = document.createElement("li");
      row.className = "blocked-site-activity-item";

      const domain = document.createElement("span");
      domain.className = "blocked-site-activity-domain";
      domain.textContent = item;
      domain.title = item;

      row.appendChild(domain);
      list.appendChild(row);
    });
  }

  async function refreshParentAccessRequests() {
    if (!parentAccessRequestList || focusMode !== "parent" || !accountToken || accessRequestRefreshBusy) return;
    accessRequestRefreshBusy = true;
    try {
      const response = await fetch(backendPath("/api/auth/profile"), {
        headers: { Authorization: `Bearer ${accountToken}` }
      });
      if (!response.ok) return;
      const profile = await response.json();
      const requests = Array.isArray(profile.progress?.accessRequests) ? profile.progress.accessRequests : [];
      parentAccessRequestList.innerHTML = "";
      const pending = requests.filter((item) => item.status === "pending");
      if (!pending.length) {
        const empty = document.createElement("li");
        empty.className = "session-activity-empty";
        empty.textContent = "No pending access requests.";
        parentAccessRequestList.appendChild(empty);
        return;
      }
      pending.forEach((item) => {
        const row = document.createElement("li");
        row.className = "parent-access-request-item";
        const domain = document.createElement("span");
        domain.textContent = item.domain;
        const approve = document.createElement("button");
        approve.type = "button";
        approve.className = "btn btn-primary btn-small";
        approve.textContent = "Allow this session";
        approve.addEventListener("click", () => decideParentAccessRequest(item.id, "approved", approve));
        const deny = document.createElement("button");
        deny.type = "button";
        deny.className = "btn btn-secondary btn-small";
        deny.textContent = "Deny";
        deny.addEventListener("click", () => decideParentAccessRequest(item.id, "denied", deny));
        row.append(domain, approve, deny);
        parentAccessRequestList.appendChild(row);
      });
    } catch (error) {
      console.warn("Could not load child access requests:", error);
    } finally {
      accessRequestRefreshBusy = false;
    }
  }

  let browsingHistoryRefreshBusy = false;

  async function renderBrowsingHistory() {
    if (!browsingHistoryPie || !browsingHistoryLegend || browsingHistoryRefreshBusy) return;
    browsingHistoryRefreshBusy = true;
    try {
      let activity = {};
      if (focusMode === "parent" || focusMode === "child") {
        if (accountToken) {
          const response = await fetch(backendPath("/api/auth/profile"), {
            headers: { Authorization: `Bearer ${accountToken}` }
          });
          if (response.ok) {
            const profile = await response.json();
            activity = profile.progress?.browsingActivity || {};
          }
        }
      }

      if (focusMode !== "parent") {
        const stored = await chrome.storage.local.get("browsingActivity");
        const localActivity = stored.browsingActivity && typeof stored.browsingActivity === "object"
          ? stored.browsingActivity
          : {};
        for (const [date, sites] of Object.entries(localActivity)) {
          activity[date] = activity[date] || {};
          for (const [domain, milliseconds] of Object.entries(sites || {})) {
            activity[date][domain] = Math.max(Number(activity[date][domain]) || 0, Number(milliseconds) || 0);
          }
        }
      }

      const days = Math.max(1, Number(browsingHistoryRange?.value) || 7);
      const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const periodActivity = {};
      Object.entries(activity).forEach(([date, sites]) => {
        if (date < cutoff) return;
        Object.entries(sites || {}).forEach(([domain, milliseconds]) => {
          const displayDomain = domain.startsWith("blocked:") ? domain.slice(8) : domain;
          periodActivity[displayDomain] = (Number(periodActivity[displayDomain]) || 0) + (Number(milliseconds) || 0);
        });
      });

      const label = browsingHistoryRange?.selectedOptions[0]?.textContent || "Past week";
      if (browsingHistoryRangeNote) browsingHistoryRangeNote.textContent = `${label} · active website time`;
      renderActivityChart(browsingHistoryPie, browsingHistoryLegend, null, periodActivity, false);
    } catch (error) {
      console.warn("Could not load browsing history:", error);
    } finally {
      browsingHistoryRefreshBusy = false;
    }
  }

  if (browsingHistoryRange) {
    browsingHistoryRange.addEventListener("change", renderBrowsingHistory);
  }

  function decideParentAccessRequest(requestId, status, button) {
    button.disabled = true;
    chrome.runtime.sendMessage({ type: "DECIDE_SITE_ACCESS_REQUEST", requestId, status }, (response) => {
      if (!response || !response.success) {
        button.disabled = false;
        button.textContent = response?.error || "Try again";
        return;
      }
      refreshParentAccessRequests();
      refreshState();
    });
  }

  let accessRequestRefreshBusy = false;

  function pdfEscape(value) {
    return String(value || "")
      .replace(/[^\x20-\x7E]/g, "?")
      .replace(/[\\()]/g, "\\$&")
      .replace(/[\r\n]+/g, " ");
  }

  function pdfNumber(value) {
    return Number(value).toFixed(3).replace(/\.0+$/, "").replace(/\.$/, "") || "0";
  }

  function pdfColor(hex) {
    const value = hex.replace("#", "");
    return [0, 2, 4].map(index => parseInt(value.slice(index, index + 2), 16) / 255)
      .map(pdfNumber)
      .join(" ");
  }

  function addPdfText(commands, x, y, size, text, color = "0.12 0.13 0.18") {
    commands.push(`BT /F1 ${size} Tf ${color} rg ${x} ${y} Td (${pdfEscape(text)}) Tj ET`);
  }

  function addPdfPieSlice(commands, centerX, centerY, radius, startDegree, endDegree, color) {
    const points = [];
    const stepCount = Math.max(2, Math.ceil((endDegree - startDegree) / 12));
    for (let step = 0; step <= stepCount; step++) {
      const degree = startDegree + ((endDegree - startDegree) * step) / stepCount;
      const radians = degree * Math.PI / 180;
      points.push([
        centerX + Math.cos(radians) * radius,
        centerY + Math.sin(radians) * radius
      ]);
    }

    commands.push(`${pdfColor(color)} rg`);
    commands.push(`${pdfNumber(centerX)} ${pdfNumber(centerY)} m`);
    points.forEach(([x, y]) => commands.push(`${pdfNumber(x)} ${pdfNumber(y)} l`));
    commands.push("h f");
  }

  function getPdfActivityEntries(activity) {
    return Object.entries(activity || {})
      .map(([domain, milliseconds]) => ({
        domain: domain.startsWith("blocked:") ? `Blocked: ${domain.slice(8)}` : domain,
        milliseconds: Number(milliseconds)
      }))
      .filter(item => item.domain && Number.isFinite(item.milliseconds) && item.milliseconds > 0)
      .sort((a, b) => b.milliseconds - a.milliseconds);
  }

  function buildAnalyticsPdf(activity, isActive, parentView) {
    const entries = getPdfActivityEntries(activity).filter(item => !item.domain.startsWith("Blocked: "));
    const totalMilliseconds = entries.reduce((total, item) => total + item.milliseconds, 0);
    const chartEntries = entries.slice(0, 6);
    if (entries.length > chartEntries.length) {
      chartEntries.push({
        domain: "Other sites",
        milliseconds: entries.slice(6).reduce((total, item) => total + item.milliseconds, 0)
      });
    }

    const firstPageEntries = entries.slice(0, 20);
    const remainingEntries = entries.slice(20);
    const pageEntryChunks = [firstPageEntries];
    for (let index = 0; index < remainingEntries.length; index += 38) {
      pageEntryChunks.push(remainingEntries.slice(index, index + 38));
    }

    const pageStreams = pageEntryChunks.map((pageEntries, pageIndex) => {
      const commands = ["q", "0.97 0.97 0.97 rg 0 0 595 842 re f"];
      addPdfText(commands, 42, 790, 22, "AuraFocus Session Analytics", "0.08 0.09 0.13");
      addPdfText(
        commands,
        42,
        768,
        10,
        `${parentView ? "Child session" : "Focus session"} - ${isActive ? "In progress" : "Last completed session"}`,
        "0.35 0.36 0.42"
      );
      addPdfText(commands, 42, 750, 9, `Generated ${new Date().toLocaleString()}`, "0.35 0.36 0.42");

      let listY = 700;
      if (pageIndex === 0) {
        if (totalMilliseconds > 0) {
          let currentDegree = -90;
          chartEntries.forEach((item, index) => {
            const nextDegree = currentDegree + (item.milliseconds / totalMilliseconds) * 360;
            addPdfPieSlice(
              commands,
              125,
              610,
              88,
              currentDegree,
              nextDegree,
              sessionActivityColors[index % sessionActivityColors.length]
            );
            currentDegree = nextDegree;
          });
          commands.push("0.97 0.97 0.97 rg 125 610 34 34 re f");
          let legendY = 682;
          chartEntries.forEach((item, index) => {
            const percentage = Math.round((item.milliseconds / totalMilliseconds) * 100);
            commands.push(`${pdfColor(sessionActivityColors[index % sessionActivityColors.length])} rg 270 ${legendY - 2} 8 8 re f`);
            addPdfText(commands, 284, legendY, 10, `${item.domain} - ${formatActivityDuration(item.milliseconds)} (${percentage}%)`);
            legendY -= 20;
          });
        } else {
          addPdfText(commands, 42, 620, 13, "No website activity was recorded for this session.", "0.35 0.36 0.42");
        }
        listY = 445;
      } else {
        listY = 720;
      }

      addPdfText(commands, 42, listY, 13, "Website breakdown", "0.08 0.09 0.13");
      listY -= 24;
      pageEntries.forEach((item, index) => {
        const absoluteIndex = pageIndex === 0 ? index : 20 + (pageIndex - 1) * 38 + index;
        const percentage = totalMilliseconds > 0 ? Math.round((item.milliseconds / totalMilliseconds) * 100) : 0;
        addPdfText(commands, 42, listY, 10, `${absoluteIndex + 1}. ${item.domain}`, "0.12 0.13 0.18");
        addPdfText(commands, 420, listY, 10, `${formatActivityDuration(item.milliseconds)} (${percentage}%)`, "0.35 0.36 0.42");
        listY -= 17;
      });

      addPdfText(commands, 42, 28, 8, `Page ${pageIndex + 1} of ${pageEntryChunks.length}`, "0.45 0.46 0.5");
      commands.push("Q");
      return commands.join("\n");
    });

    const objects = [null];
    const addObject = (value) => {
      objects.push(value);
      return objects.length - 1;
    };
    const catalogReference = addObject(null);
    const pagesReference = addObject(null);
    const fontReference = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
    const pageReferences = [];

    pageStreams.forEach(stream => {
      const contentReference = addObject(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
      pageReferences.push(addObject(
        `<< /Type /Page /Parent ${pagesReference} 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontReference} 0 R >> >> /Contents ${contentReference} 0 R >>`
      ));
    });

    objects[catalogReference] = `<< /Type /Catalog /Pages ${pagesReference} 0 R >>`;
    objects[pagesReference] = `<< /Type /Pages /Kids [${pageReferences.map(reference => `${reference} 0 R`).join(" ")}] /Count ${pageReferences.length} >>`;

    let pdf = "%PDF-1.4\n";
    const offsets = [0];
    objects.slice(1).forEach((object, index) => {
      offsets.push(new TextEncoder().encode(pdf).length);
      pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
    });
    const xrefOffset = new TextEncoder().encode(pdf).length;
    pdf += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
    for (let index = 1; index < objects.length; index++) {
      pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
    }
    pdf += `trailer\n<< /Size ${objects.length} /Root ${catalogReference} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
    return new Blob([pdf], { type: "application/pdf" });
  }

  function downloadSessionAnalyticsPdf() {
    const blob = buildAnalyticsPdf(
      latestSessionActivity,
      latestSessionActivityIsActive,
      latestSessionActivityIsParentView
    );
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const date = new Date().toISOString().slice(0, 10);
    link.href = downloadUrl;
    link.download = `aurafocus-session-analytics-${date}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
  }

  function downloadSessionActivityImage(activity = latestSessionActivity, filenamePrefix = "session-chart") {
    const entries = getPdfActivityEntries(activity).filter(item => !item.domain.startsWith("Blocked: "));
    const totalMilliseconds = entries.reduce((total, item) => total + item.milliseconds, 0);
    const chartEntries = entries.slice(0, 6);
    if (entries.length > chartEntries.length) {
      chartEntries.push({
        domain: "Other sites",
        milliseconds: entries.slice(6).reduce((total, item) => total + item.milliseconds, 0)
      });
    }

    const canvas = document.createElement("canvas");
    canvas.width = 900;
    canvas.height = 500;
    const context = canvas.getContext("2d");
    if (!context) return;

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    const centerX = 220;
    const centerY = 250;
    const radius = 190;
    if (totalMilliseconds > 0) {
      let currentAngle = -Math.PI / 2;
      chartEntries.forEach((item, index) => {
        const sliceAngle = (item.milliseconds / totalMilliseconds) * Math.PI * 2;
        context.beginPath();
        context.moveTo(centerX, centerY);
        context.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
        context.closePath();
        context.fillStyle = sessionActivityColors[index % sessionActivityColors.length];
        context.fill();
        currentAngle += sliceAngle;
      });
    }

    context.beginPath();
    context.arc(centerX, centerY, radius, 0, Math.PI * 2);
    context.strokeStyle = "rgba(255, 255, 255, 0.28)";
    context.lineWidth = 2;
    context.stroke();

    if (totalMilliseconds > 0) {
      let legendY = 100;
      chartEntries.forEach((item, index) => {
        const percentage = Math.round((item.milliseconds / totalMilliseconds) * 100);
        context.fillStyle = sessionActivityColors[index % sessionActivityColors.length];
        context.fillRect(470, legendY - 15, 16, 16);
        context.fillStyle = "#151821";
        context.font = "18px Arial";
        const domainLabel = item.domain.length > 32 ? `${item.domain.slice(0, 29)}...` : item.domain;
        context.fillText(`${domainLabel} - ${formatActivityDuration(item.milliseconds)} (${percentage}%)`, 500, legendY);
        legendY += 52;
      });
    }

    canvas.toBlob((blob) => {
      if (!blob) return;
      const imageUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const date = new Date().toISOString().slice(0, 10);
      link.href = imageUrl;
      link.download = `aurafocus-${filenamePrefix}-${date}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(imageUrl), 1000);
    }, "image/png");
  }

  function downloadCategoryActivityImage() {
    downloadSessionActivityImage(buildGroupActivity(latestSessionActivity), "category-chart");
  }

  function downloadBlockedSiteActivityImage(activity = latestSessionActivity) {
    const domains = Object.entries(activity || {})
      .filter(([domain, milliseconds]) => domain.startsWith("blocked:") && Number(milliseconds) > 0)
      .map(([domain]) => domain.slice(8))
      .sort((a, b) => a.localeCompare(b));

    const canvas = document.createElement("canvas");
    canvas.width = 900;
    canvas.height = Math.max(150, 92 + domains.length * 42);
    const context = canvas.getContext("2d");
    if (!context) return;

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#151821";
    context.font = "bold 24px Arial";
    context.fillText("Blocked Sites Visited", 40, 48);

    if (domains.length === 0) {
      context.font = "18px Arial";
      context.fillText("No blocked sites visited.", 40, 94);
    } else {
      context.font = "18px Arial";
      domains.forEach((domain, index) => {
        const y = 92 + index * 42;
        context.fillStyle = sessionActivityColors[index % sessionActivityColors.length];
        context.fillRect(42, y - 15, 16, 16);
        context.fillStyle = "#151821";
        const domainLabel = domain.length > 70 ? `${domain.slice(0, 67)}...` : domain;
        context.fillText(domainLabel, 76, y);
      });
    }

    canvas.toBlob((blob) => {
      if (!blob) return;
      const imageUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const date = new Date().toISOString().slice(0, 10);
      link.href = imageUrl;
      link.download = `aurafocus-blocked-sites-${date}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(imageUrl), 1000);
    }, "image/png");
  }

  function refreshSessionActivity() {
    chrome.runtime.sendMessage({ type: "GET_SESSION_ACTIVITY" }, (response) => {
      if (chrome.runtime.lastError || !response || !response.success) return;
      latestSessionActivity = response.activity || {};
      latestSessionActivityIsActive = !!response.isActive;
      latestSessionActivityIsParentView = !!response.isParentView;
      renderActivityChart(
        sessionActivityPie,
        sessionActivityLegend,
        sessionActivityLabel,
        response.activity,
        response.isActive,
        false,
        true
      );
      renderActivityChart(
        parentSessionActivityPie,
        parentSessionActivityLegend,
        parentSessionActivityLabel,
        response.activity,
        response.isActive,
        !!response.isParentView,
        true
      );
      const groupActivity = buildGroupActivity(response.activity);
      renderActivityChart(
        groupActivityPie,
        groupActivityLegend,
        null,
        groupActivity,
        response.isActive,
        false,
        false,
        true
      );
      renderActivityChart(
        parentGroupActivityPie,
        parentGroupActivityLegend,
        null,
        groupActivity,
        response.isActive,
        !!response.isParentView,
        false,
        true
      );
      renderBlockedSiteActivity(blockedSiteActivityList, response.activity);
      renderBlockedSiteActivity(parentBlockedSiteActivityList, response.activity);
      if (response.isParentView) {
        updateParentStopControls(response.isActive);
      }
    });
  }

  if (sessionActivityImageDownload) {
    sessionActivityImageDownload.addEventListener("click", () => downloadSessionActivityImage());
  }
  if (parentSessionActivityImageDownload) {
    parentSessionActivityImageDownload.addEventListener("click", () => downloadSessionActivityImage());
  }
  if (groupActivityImageDownload) {
    groupActivityImageDownload.addEventListener("click", downloadCategoryActivityImage);
  }
  if (parentGroupActivityImageDownload) {
    parentGroupActivityImageDownload.addEventListener("click", downloadCategoryActivityImage);
  }
  if (blockedSiteActivityDownload) {
    blockedSiteActivityDownload.addEventListener("click", () => downloadBlockedSiteActivityImage());
  }
  if (parentBlockedSiteActivityDownload) {
    parentBlockedSiteActivityDownload.addEventListener("click", () => downloadBlockedSiteActivityImage());
  }

  // --- PASSWORD VISIBILITY TOGGLE ---
  function setupPasswordToggles() {
    document.querySelectorAll(".toggle-password-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const input = btn.parentElement.querySelector("input");
        if (!input) return;

        if (input.type === "password") {
          input.type = "text";
          btn.innerHTML = `
            <svg class="eye-off-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
          `;
        } else {
          input.type = "password";
          btn.innerHTML = `
            <svg class="eye-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
          `;
        }
      });
    });
  }

  // --- WHITELIST LOCK/UNLOCK ---
  btnPromptUnlockWhitelist.addEventListener("click", () => {
    whitelistLockOverlay.style.display = "none";
    whitelistUnlockInputContainer.style.display = "flex";
    whitelistUnlockPassword.focus();
  });

  btnCancelUnlockWhitelist.addEventListener("click", () => {
    whitelistUnlockInputContainer.style.display = "none";
    whitelistLockOverlay.style.display = "flex";
    whitelistUnlockPassword.value = "";
    whitelistUnlockError.style.display = "none";
  });

  btnConfirmUnlockWhitelist.addEventListener("click", () => {
    const password = whitelistUnlockPassword.value;
    if (!password) {
      showError(whitelistUnlockError, "Password required.");
      return;
    }

    // Try a test whitelist update with same array to verify password
    chrome.runtime.sendMessage({
      type: "UPDATE_WHITELIST",
      allowedUrls: currentAllowedUrls,
      password: password
    }, (response) => {
      if (response && response.success) {
        isWhitelistUnlocked = true;
        whitelistUnlockInputContainer.style.display = "none";
        whitelistLockOverlay.style.display = "none";
        whitelistUnlockPassword.value = "";
        whitelistUnlockError.style.display = "none";
      } else {
        showError(whitelistUnlockError, response.error || "Incorrect password.");
      }
    });
  });

  function showError(element, message) {
    element.textContent = message;
    element.style.display = "block";
    setTimeout(() => {
      element.style.display = "none";
    }, 4000);
  }

  // Change Password Form Submission
  if (changePasswordForm) {
    changePasswordForm.addEventListener("submit", (e) => {
      if (focusMode === "child") {
        e.preventDefault();
        return;
      }
      e.preventDefault();
      const oldPass = changeOldPassword.value;
      const newPass = changeNewPassword.value;
      const confirmPass = changeConfirmPassword.value;

      if (newPass !== confirmPass) {
        showError(changePasswordError, "New passwords do not match.");
        return;
      }

      if (newPass.length < 4) {
        showError(changePasswordError, "New password must be at least 4 characters.");
        return;
      }

      chrome.runtime.sendMessage({
        type: "CHANGE_PASSWORD",
        oldPassword: oldPass,
        newPassword: newPass
      }, (response) => {
        if (response && response.success) {
          changeOldPassword.value = "";
          changeNewPassword.value = "";
          changeConfirmPassword.value = "";
          changePasswordError.style.display = "none";
          
          changePasswordSuccess.style.display = "block";
          setTimeout(() => {
            changePasswordSuccess.style.display = "none";
          }, 3000);
          
          syncProgress();
          refreshState();
        } else {
          showError(changePasswordError, response.error || "Failed to change password.");
        }
      });
    });
  }

  // --- FEEDBACK RATING HANDLERS ---
  let selectedRating = 0;
  let selectedThumb = null; // 'up' or 'down'

  // Thumb buttons
  if (btnThumbUp && btnThumbDown) {
    btnThumbUp.addEventListener("click", () => {
      selectedThumb = selectedThumb === "up" ? null : "up";
      updateThumbUI();
    });

    btnThumbDown.addEventListener("click", () => {
      selectedThumb = selectedThumb === "down" ? null : "down";
      updateThumbUI();
    });
  }

  function updateThumbUI() {
    if (selectedThumb === "up") {
      btnThumbUp.classList.add("active-up");
      btnThumbDown.classList.remove("active-down");
    } else if (selectedThumb === "down") {
      btnThumbDown.classList.add("active-down");
      btnThumbUp.classList.remove("active-up");
    } else {
      btnThumbUp.classList.remove("active-up");
      btnThumbDown.classList.remove("active-down");
    }
  }

  // Star buttons
  starBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      const rating = parseInt(btn.dataset.rating, 10);
      selectedRating = selectedRating === rating ? 0 : rating;
      updateStarsUI();
    });
  });

  function updateStarsUI() {
    starBtns.forEach(btn => {
      const rating = parseInt(btn.dataset.rating, 10);
      if (rating <= selectedRating) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });
  }

  // Submit feedback
  if (btnSubmitFeedback) {
    btnSubmitFeedback.addEventListener("click", async () => {
      const commentsText = feedbackComments ? feedbackComments.value.trim() : "";

      if (selectedRating === 0 && !selectedThumb && !commentsText) {
        if (feedbackError) {
          feedbackError.textContent = "Please rate the session, choose a thumb, or add a comment before submitting.";
          feedbackError.style.display = "block";
        }
        return;
      }
      if (feedbackError) {
        feedbackError.style.display = "none";
      }

      const feedback = {
        rating: selectedRating,
        thumb: selectedThumb,
        comments: commentsText,
        timestamp: Date.now()
      };

      // 1. Submit to server database asynchronously (fails silently if offline/unconfigured)
      try {
        fetch(backendPath("/api/feedback"), {
          method: "POST",
          headers: getFeedbackHeaders(),
          body: JSON.stringify({
            ...feedback,
            feedbackKey: getFeedbackKey()
          })
        }).catch(err => console.error("Failed to submit feedback to server:", err));
      } catch (e) {
        console.error("Feedback dispatch error:", e);
      }

      // 2. Save locally in extension storage
      const result = await chrome.storage.local.get("feedbackHistory");
      const history = result.feedbackHistory || [];
      history.push(feedback);
      
      await chrome.storage.local.set({ 
        feedbackHistory: history, 
        showFeedbackPrompt: false 
      });
      hasSubmittedSessionFeedback = true;
      await syncProgress();

      // Show success feedback
      feedbackSuccessMsg.style.display = "block";

      // Reset feedback form states
      selectedRating = 0;
      selectedThumb = null;
      if (feedbackComments) {
        feedbackComments.value = "";
      }
      updateThumbUI();
      updateStarsUI();

      setTimeout(() => {
        feedbackSuccessMsg.style.display = "none";
        window.close();
        refreshState();
      }, 1500);
    });
  }

  if (btnLaterFeedback) {
    btnLaterFeedback.addEventListener("click", async () => {
      // Snooze this prompt until the next focus session ends.
      await chrome.storage.local.set({
        showFeedbackPrompt: false,
        feedbackPromptDeferred: true
      });
      window.close();
    });
  }

  // Listen for session end from background
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === "SESSION_ENDED") {
      isWhitelistUnlocked = false;
      refreshState();
      refreshSessionActivity();
    }
  });

  async function getOrCreateFeedbackUserId() {
    const result = await chrome.storage.local.get("feedbackUserId");
    if (result.feedbackUserId) {
      return result.feedbackUserId;
    }

    const newId = `fb_${crypto.randomUUID()}`;
    await chrome.storage.local.set({ feedbackUserId: newId });
    return newId;
  }

  function getFeedbackKey() {
    const email = typeof accountUser?.email === "string" ? accountUser.email.trim().toLowerCase() : "";
    return email ? `account:${email}` : feedbackUserId;
  }

  function getFeedbackHeaders() {
    return {
      "Content-Type": "application/json",
      ...(accountToken ? { Authorization: `Bearer ${accountToken}` } : {})
    };
  }

  async function loadSessionFeedbackState() {
    const result = await chrome.storage.local.get("feedbackHistory");
    hasSubmittedSessionFeedback = Array.isArray(result.feedbackHistory) && result.feedbackHistory.length > 0;
  }

  async function loadAccount() {
    const result = await chrome.storage.local.get(["accountToken", "accountUser"]);
    accountToken = result.accountToken || null;
    accountUser = result.accountUser || null;
    renderAccount();

    if (!accountToken) return;

    try {
      const response = await fetch(backendPath("/api/auth/profile"), {
        headers: { Authorization: `Bearer ${accountToken}` }
      });
      if (!response.ok) {
        if (response.status === 401) {
          accountToken = null;
          accountUser = null;
          await chrome.storage.local.remove(["accountToken", "accountUser"]);
          renderAccount();
          showError(accountError, "Your Google session expired. Sign in again to sync progress.");
          return;
        }
        console.warn("Account profile refresh failed; keeping stored login until logout.");
        return;
      }

      const data = await response.json();
      accountUser = data.user;
      await chrome.storage.local.set({ accountUser });
      await restoreProgress(data.progress);
      renderAccount();
    } catch (e) {
      console.error("Could not refresh account profile:", e);
    }
  }

  function renderAccount() {
    if (!accountForm || !btnAccountLogout) return;

    if (accountToken && accountUser) {
      accountForm.style.display = "none";
      btnAccountLogout.style.display = "inline-flex";
      if (accountStatusText) accountStatusText.textContent = `Signed in as ${accountUser.email}. Progress sync is on.`;
    } else {
      accountForm.style.display = "flex";
      btnAccountLogout.style.display = "none";
    }
  }

  async function accountRequest(path, payload) {
    let response;
    try {
      response = await fetch(backendPath(path), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
    } catch (error) {
      throw new Error("Could not reach the account server. Check your internet connection and try again.");
    }

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const serverMessage = data.error || data.message;
      const normalizedServerMessage = typeof serverMessage === "string"
        ? serverMessage.toLowerCase()
        : "";
      if (path === "/api/auth/login" && (
        response.status === 404 ||
        normalizedServerMessage.includes("application not found")
      )) {
        throw new Error("Email or password is incorrect.");
      }

      if (serverMessage) {
        throw new Error(serverMessage);
      }

      const statusMessage = response.statusText ? ` ${response.statusText}` : "";
      throw new Error(`Account server error: ${response.status}${statusMessage}.`);
    }

    return data;
  }

  async function finishGoogleAccountLogin(data) {
    accountToken = data.token;
    accountUser = data.user;
    await chrome.storage.local.set({ accountToken, accountUser });
    await restoreProgress(data.progress);
    renderAccount();
    await refreshState();
    await syncProgress();
  }

  let googleSignInInProgress = false;

  async function signInWithGoogle() {
    if (googleSignInInProgress) return;
    googleSignInInProgress = true;
    const originalButtonText = btnAccountGoogle ? btnAccountGoogle.textContent : "Continue with Google";
    if (btnAccountGoogle) {
      btnAccountGoogle.disabled = true;
      btnAccountGoogle.textContent = "Opening Google...";
      btnAccountGoogle.setAttribute("aria-busy", "true");
    }
    hideAccountError();
    try {
      const configResponse = await fetch(backendPath("/api/auth/config"));
      const config = await configResponse.json().catch(() => ({}));
      if (!configResponse.ok || !config.authorizationUrl || !config.clientId || !config.extensionRedirectUri) {
        throw new Error(config.error || "Google sign-in is not configured yet.");
      }

      const redirectUri = chrome.identity.getRedirectURL("callback");
      if (redirectUri !== config.extensionRedirectUri) {
        throw new Error("The extension OAuth callback does not match the server configuration.");
      }

      const state = createRandomString();
      const codeVerifier = createRandomString(48);
      const codeChallenge = await createCodeChallenge(codeVerifier);
      const authorizeUrl = new URL(config.authorizationUrl);
      authorizeUrl.search = new URLSearchParams({
        client_id: config.clientId,
        redirect_uri: redirectUri,
        response_type: "code",
        scope: "openid profile email",
        state,
        code_challenge: codeChallenge,
        code_challenge_method: "S256",
      }).toString();

      const callbackUrl = await chrome.identity.launchWebAuthFlow({
        url: authorizeUrl.toString(),
        interactive: true,
      });
      const callback = new URL(callbackUrl);
      if (callback.searchParams.get("state") !== state) {
        throw new Error("Google sign-in state validation failed.");
      }
      if (callback.searchParams.get("error")) {
        throw new Error(callback.searchParams.get("error_description") || "Google sign-in was cancelled.");
      }

      const code = callback.searchParams.get("code");
      if (!code) {
        throw new Error("Google did not return a sign-in code.");
      }

      const data = await accountRequest("/api/auth/google-login", {
        code,
        codeVerifier,
        redirectUri,
      });
      await finishGoogleAccountLogin(data);
    } catch (e) {
      const message = /only one web auth flow is allowed at a time/i.test(e.message)
        ? "A Google sign-in window is already open. Finish or close it, then try again."
        : e.message;
      showError(accountError, message);
    } finally {
      googleSignInInProgress = false;
      if (btnAccountGoogle) {
        btnAccountGoogle.disabled = false;
        btnAccountGoogle.textContent = originalButtonText;
        btnAccountGoogle.removeAttribute("aria-busy");
      }
    }
  }

  async function restoreProgress(progress) {
    await new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: "RESTORE_PROGRESS", progress }, (response) => {
        if (!response || !response.success) {
          showError(accountError, (response && response.error) || "Could not restore progress.");
        }
        resolve();
      });
    });
  }

  async function buildProgressPayload() {
    const result = await chrome.storage.local.get([
      "allowedUrls",
      "whitelistHistory",
      "historyGroups",
      "feedbackHistory",
      "password",
      "parentPassword",
      "parentEmail",
      "childLinked",
      "childSyncCompletedAt",
      "focusMode",
      "modeLocked",
      "permanentFeedback",
      "accessRequests",
      "sessionHistory"
    ]);
    return {
      allowedUrls: result.allowedUrls || [],
      whitelistHistory: result.whitelistHistory || [],
      historyGroups: result.historyGroups || [],
      feedbackHistory: result.feedbackHistory || [],
      lockPassword: result.password || "",
      parentPassword: result.parentPassword || "",
      parentEmail: result.parentEmail || "",
      childLinked: !!result.childLinked,
      childSyncCompletedAt: Number(result.childSyncCompletedAt) || 0,
      focusMode: result.focusMode || "self",
      modeLocked: !!result.modeLocked,
      permanentFeedback: result.permanentFeedback || permanentFeedback,
      accessRequests: result.accessRequests || [],
      sessionHistory: result.sessionHistory || []
    };
  }

  async function syncProgress() {
    if (!accountToken) {
      return {
        success: false,
        error: "Sign in with Google in Account Sync before saving a parent password."
      };
    }
    try {
      const progress = await buildProgressPayload();
      const response = await fetch(backendPath("/api/progress"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accountToken}`
        },
        body: JSON.stringify({ progress })
      });
      if (!response.ok) {
        if (response.status === 401) {
          accountToken = null;
          accountUser = null;
          await chrome.storage.local.remove(["accountToken", "accountUser"]);
          renderAccount();
          throw new Error("Your Google session expired. Sign in again.");
        }
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || `Account sync failed with status ${response.status}.`);
      }
      return { success: true };
    } catch (e) {
      console.error("Progress sync failed:", e);
      return {
        success: false,
        error: e.message || "Account sync failed."
      };
    }
  }

  function hideAccountError() {
    if (accountError) {
      accountError.style.display = "none";
    }
  }

  if (btnAccountGoogle) {
    btnAccountGoogle.addEventListener("click", signInWithGoogle);
  }

  if (btnAccountLogout) {
    btnAccountLogout.addEventListener("click", () => {
      chrome.runtime.sendMessage({ type: "REQUEST_ACCOUNT_LOGOUT" }, (response) => {
        if (chrome.runtime.lastError || !response?.success) {
          showError(accountError, "Could not check this device's sync status. Try again.");
          return;
        }
        if (response.requiresParentPassword) {
          if (childLogoutError) childLogoutError.style.display = "none";
          if (childLogoutPassword) childLogoutPassword.value = "";
          if (childLogoutForm) childLogoutForm.style.display = "flex";
          childLogoutPassword?.focus();
          return;
        }
        finishAccountLogout();
      });
    });
  }

  if (btnChildLogoutCancel) {
    btnChildLogoutCancel.addEventListener("click", () => {
      if (childLogoutForm) childLogoutForm.style.display = "none";
      if (childLogoutError) childLogoutError.style.display = "none";
      if (childLogoutPassword) childLogoutPassword.value = "";
    });
  }

  if (childLogoutForm) {
    childLogoutForm.addEventListener("submit", (event) => {
      event.preventDefault();
      if (childLogoutError) childLogoutError.style.display = "none";
      chrome.runtime.sendMessage({
        type: "LOGOUT_ACCOUNT",
        parentPassword: childLogoutPassword?.value || ""
      }, (response) => {
        if (chrome.runtime.lastError || !response?.success) {
          if (childLogoutError) {
            childLogoutError.textContent = response?.error || "Could not verify the parent sync password.";
            childLogoutError.style.display = "block";
          }
          return;
        }
        childLogoutForm.style.display = "none";
        finishAccountLogout();
      });
    });
  }

  function finishAccountLogout() {
    accountToken = null;
    accountUser = null;
    modeLocked = false;
    hideAccountError();
    if (focusModeSelect) focusModeSelect.disabled = false;
    if (childLogoutForm) childLogoutForm.style.display = "none";
    renderAccount();
    refreshState();
  }

  async function loadPermanentFeedback() {
    const result = await chrome.storage.local.get("permanentFeedback");
    permanentFeedback = {
      rating: Number(result.permanentFeedback && result.permanentFeedback.rating) || 0,
      thumb: result.permanentFeedback && (result.permanentFeedback.thumb === "up" || result.permanentFeedback.thumb === "down")
        ? result.permanentFeedback.thumb
        : null,
      comments: typeof (result.permanentFeedback && result.permanentFeedback.comments) === "string"
        ? result.permanentFeedback.comments
        : ""
    };
  }

  function bindPermanentFeedbackControls() {
    if (permThumbUp) {
      permThumbUp.addEventListener("click", () => {
        permanentFeedback.thumb = permanentFeedback.thumb === "up" ? null : "up";
        renderPermanentFeedback();
      });
    }

    if (permThumbDown) {
      permThumbDown.addEventListener("click", () => {
        permanentFeedback.thumb = permanentFeedback.thumb === "down" ? null : "down";
        renderPermanentFeedback();
      });
    }

    permStarBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        const rating = parseInt(btn.dataset.rating, 10);
        permanentFeedback.rating = permanentFeedback.rating === rating ? 0 : rating;
        renderPermanentFeedback();
      });
    });

    if (permFeedbackComments) {
      permFeedbackComments.addEventListener("input", () => {
        permanentFeedback.comments = permFeedbackComments.value;
      });
    }

    if (permFeedbackSubmit) {
      permFeedbackSubmit.addEventListener("click", savePermanentFeedback);
    }
  }

  function renderPermanentFeedback() {
    if (permFeedbackSuccess) permFeedbackSuccess.style.display = "none";
    if (permFeedbackError) permFeedbackError.style.display = "none";
    if (permFeedbackComments) {
      permFeedbackComments.value = permanentFeedback.comments || "";
    }

    if (permThumbUp && permThumbDown) {
      permThumbUp.classList.toggle("active-up", permanentFeedback.thumb === "up");
      permThumbDown.classList.toggle("active-down", permanentFeedback.thumb === "down");
    }

    permStarBtns.forEach((btn) => {
      const rating = parseInt(btn.dataset.rating, 10);
      btn.classList.toggle("active", rating <= permanentFeedback.rating && permanentFeedback.rating > 0);
    });
  }

  async function savePermanentFeedback() {
    const comments = typeof permanentFeedback.comments === "string" ? permanentFeedback.comments.trim() : "";
    if (!permanentFeedback.rating && !permanentFeedback.thumb && !comments) {
      showError(permFeedbackError, "Choose a rating, a thumbs vote, or add a comment before submitting.");
      return;
    }

    if (permFeedbackError) permFeedbackError.style.display = "none";
    if (permFeedbackSubmit) permFeedbackSubmit.disabled = true;
    renderPermanentFeedback();
    permanentFeedback.comments = comments;
    await chrome.storage.local.set({ permanentFeedback });
    if (accountToken) {
      const progressResult = await syncProgress();
      if (!progressResult.success) {
        if (permFeedbackError) {
          permFeedbackError.textContent = progressResult.error || "Could not sync feedback.";
          permFeedbackError.style.display = "block";
        }
        if (permFeedbackSubmit) permFeedbackSubmit.disabled = false;
        return;
      }
    }

    if (accountToken) {
      try {
        const response = await fetch(backendPath("/api/feedback"), {
          method: "POST",
          headers: getFeedbackHeaders(),
          body: JSON.stringify({
            rating: permanentFeedback.rating,
            thumb: permanentFeedback.thumb,
            comments: permanentFeedback.comments || "",
            feedbackKey: getFeedbackKey()
          })
        });
        if (!response.ok) throw new Error("Could not submit feedback to the server.");
        if (permFeedbackSuccess) {
          permFeedbackSuccess.style.display = "block";
          setTimeout(() => {
            permFeedbackSuccess.style.display = "none";
          }, 1500);
        }
      } catch (e) {
        console.error("Failed to save permanent feedback:", e);
        if (permFeedbackError) {
          permFeedbackError.textContent = e.message || "Could not submit feedback.";
          permFeedbackError.style.display = "block";
        }
      } finally {
        if (permFeedbackSubmit) permFeedbackSubmit.disabled = false;
      }
    } else {
      if (permFeedbackSuccess) {
        permFeedbackSuccess.textContent = "Feedback saved on this device. Sign in to sync it across devices.";
        permFeedbackSuccess.style.display = "block";
        setTimeout(() => {
          permFeedbackSuccess.style.display = "none";
          permFeedbackSuccess.textContent = "Feedback saved.";
        }, 2500);
      }
      if (permFeedbackSubmit) permFeedbackSubmit.disabled = false;
    }
  }
});
