"use strict";
// Clean 30: all plan content lives here. Edit this file, then bump CACHE in sw.js.

const START_DEFAULT = "2026-11-06";
const DAYS = 30;

const HABITS = [
  { id: "porn", name: "No porn", short: "Porn", color: "#a78bfa", group: "urge",
    rule: "Zero porn. That includes \"almost porn\": thirst-trap reels, searching \"just to look\", saved pics." },
  { id: "nut", name: "No nut", short: "Nut", color: "#38bdf8", group: "urge",
    rule: "No masturbation, no orgasm. A wet dream is not a slip, so don't log it as one." },
  { id: "sugar", name: "No sugar", short: "Sugar", color: "#fbbf24", group: "sugar",
    rule: "No added sugar: chai sugar, sweets, biscuits, juice, soft drinks, jaggery, honey. Whole fruit is fine." },
];

const TRIGGERS = {
  urge: ["Bored", "Late night in bed", "Phone in bed", "Stressed", "Lonely", "Saw something online", "Alone at home", "Tired", "Bad day", "Woke up horny"],
  sugar: ["Chai time", "After a meal", "Office treats", "Stressed", "Tired", "Party / family", "Ate too little", "Out of nowhere", "Saw it at the store"],
};

// SOS: a 10-minute urge-surf. Urges peak and fade if you don't feed them.
const SOS = {
  urge: {
    title: "Porn / nut urge",
    lead: "This is a wave. It peaks and fades in 10 to 20 minutes if you don't feed it. Your only job is to not be alone with your phone while it passes.",
    steps: [
      "Stand up. Leave the room you're in. Put the phone face-down or leave it there.",
      "30 bodyweight squats or a 60-second wall sit. Legs only, so your shoulder stays safe.",
      "Cold water on your face and wrists.",
      "Breathe in for 4, out for 6. Ten rounds.",
      "Read your why (below), out loud if you can.",
      "Name the trigger, then go outside for a walk or call someone until the timer ends.",
    ],
  },
  sugar: {
    title: "Sugar craving",
    lead: "Cravings for sugar fade within minutes and get weaker every day you don't feed them. By week 2 they're a fraction of what you feel now.",
    steps: [
      "Drink a full glass of water.",
      "Ask yourself: am I hungry or just craving? If you're hungry, eat a meal from your plan: chicken, curd, dal, roti.",
      "Brush your teeth or chew sugar-free gum. Sweet food tastes wrong after that.",
      "Get away from the food. Leave the kitchen, the office pantry or the shop aisle.",
      "Name the trigger.",
      "If you still want something sweet when the timer ends, have one whole fruit. That counts as clean.",
    ],
  },
};

const MOODS = ["Rough", "Low", "OK", "Good", "Great"];

// One line per day. Short, practical, honest.
const TIPS = [
  "Day 1 is setup day. Do the setup checklist in Guide tonight: DNS filter, phone out of the bedroom, sugar out of the house.",
  "Cravings for sugar are strongest on days 2 to 5. Expect them. Drink your chai without sugar today: it tastes bad for about 10 days, then it doesn't.",
  "Your danger window is the last hour before sleep, in bed, on your phone. Charge the phone outside the bedroom tonight.",
  "Boredom causes more slips than horniness does. Have a plan for empty evenings: gym, a walk, a call, cooking tomorrow's chicken.",
  "An urge is a suggestion, not an order. Notice it, name it (\"urge\"), and let the SOS timer run. You don't have to argue with it.",
  "Read food labels today. If sugar, glucose, syrup or jaggery is in the first three ingredients, put it back.",
  "One week done. Check your Stats tab: when do your urges hit? Plan tomorrow around that hour.",
  "Week 2 is when the novelty wears off and \"just this once\" starts to sound reasonable. It isn't. Same rules.",
  "Unfollow or mute every account that makes you scroll for skin. On Instagram, set Sensitive content to \"Less\".",
  "Sugar cravings at 4 pm usually mean lunch was too small or too low in protein. Eat more chicken at lunch, not less.",
  "If you feel flat or low on desire this week, that's commonly reported and it passes. It doesn't mean anything is wrong.",
  "Stress is a trigger for both habits. Your gym session is the best stress release you have. Don't skip it.",
  "Eating out tonight? Decide before you go: no dessert, no sweet drink, no sweet lassi. Deciding there is how you lose.",
  "Two weeks. The streak is not the point; the person who can sit with an urge is the point. You're building that.",
  "Halfway point. Look at your trigger list in Stats and remove one trigger for good this week.",
  "Fewer late nights means fewer slips. Aim to be in bed by the same time every night this week, without the phone.",
  "Chai at work with sugar already in it? Ask for it without, or take black coffee. One awkward ask beats a broken day.",
  "A wet dream is normal and is not a slip. Don't log it as one and don't use it as an excuse to \"reset\".",
  "If you slipped recently: never miss twice. One slip is an event; two in a row is the old habit coming back.",
  "Notice how much time you've got back. Use it for something you can point to on day 30.",
  "Week 3. Cravings for sweets are weaker now. Fruit should start tasting sweeter than it used to.",
  "Weekends are the riskiest days: more free time, less structure. Plan Saturday's evening right now.",
  "If you're scrolling with no reason, close the app. Mindless scrolling is how most porn slips start.",
  "Festival or party sweets coming up? Eat a proper meal before you go. Turning down a sweet is easy on a full stomach.",
  "Write in today's note what's different compared with day 1. Be specific: sleep, energy, focus, waist.",
  "Five days left. Don't coast. The last week is when \"I've basically done it\" turns into a slip.",
  "Your filters can be switched off in ten seconds. They're there to slow you down. The real wall is the habit you've built.",
  "Decide now what days 31 to 60 look like. Keep the phone out of the bedroom and the DNS filter on, at minimum.",
  "Second to last day. Read your why one more time and compare it with where you are now.",
  "Day 30. Finish clean, then look at your Stats honestly: clean days, urges beaten, triggers. That's your data for the next 30.",
];

const SETUP = [
  { id: "dns", t: "Turn on a porn filter for the whole phone",
    d: "Settings → Network & internet → Private DNS → Private DNS provider hostname → <code>adult-filter-dns.cleanbrowsing.org</code>. This blocks adult sites in every app and browser, including incognito." },
  { id: "safe", t: "Lock Google SafeSearch on",
    d: "Open google.com/safesearch and set it to Filter." },
  { id: "laptop", t: "Filter your laptop as well",
    d: "In Chrome: Settings → Privacy and security → Use secure DNS → Custom → <code>https://doh.cleanbrowsing.org/doh/adult-filter/</code>." },
  { id: "feed", t: "Clean your feeds",
    d: "Unfollow thirst-trap accounts. On Instagram: Settings → Content preferences → Sensitive content → Less. Turn off NSFW on Reddit and X." },
  { id: "bed", t: "Phone charges outside the bedroom",
    d: "This is the single biggest lever. Buy a cheap alarm clock if the phone is your alarm." },
  { id: "purge", t: "Delete the stash",
    d: "Saved files, bookmarks, alt accounts, apps you only use for it. All of it, tonight." },
  { id: "sugarout", t: "Get the sugar out of your home",
    d: "Biscuits, sweets, chocolate, juice, sugar packets. Give them away. Buy fruit and plain curd instead." },
  { id: "why", t: "Write your why in this app",
    d: "Stats → My why. It's shown to you every time you hit SOS." },
];

const GUIDE = [
  { t: "The rules: what counts as a slip", html: `
    <h4>No porn</h4>
    <ul><li>Any porn, on any device, for any length of time.</li>
    <li>\"Almost porn\" counts: scrolling reels or accounts for skin, searching for images, re-watching saved stuff.</li>
    <li>Accidentally seeing something and closing it right away isn't a slip. Staying on it is.</li></ul>
    <h4>No nut</h4>
    <ul><li>No masturbation and no orgasm, for 30 days.</li>
    <li>A wet dream is <b>not</b> a slip. It's your body doing its thing. Don't log it.</li>
    <li>Edging counts as a slip. It feeds the same loop.</li></ul>
    <h4>No sugar</h4>
    <ul><li>Added sugar counts: sugar in chai or coffee, sweets and mithai, biscuits and rusk, cake, ice cream, chocolate, soft drinks, any fruit juice, sweet lassi, flavoured yoghurt, sugary cereal and granola, protein bars with sugar, ketchup.</li>
    <li>Jaggery (gur), honey, dates and raisins also count for these 30 days. They're still sugar.</li>
    <li><b>Allowed:</b> whole fruit (1 to 2 a day fits your gym plan), plain milk, plain curd, vegetables, roti, rice, dal.</li>
    <li>A zero-calorie sweetener in chai is allowed. If it keeps the craving alive, drop it after week 2.</li></ul>
    <p class="callout">Check in honestly. A fake clean day makes the whole tracker worthless, and you're the only one who sees it.</p>` },
  { t: "How urges work", html: `
    <p>An urge rises, peaks, and fades, usually within 10 to 20 minutes, <b>if you don't feed it</b>. Feeding it means scrolling, \"just checking\", or staying in bed with your phone. Every urge you ride out without acting on it makes the next one a little weaker.</p>
    <h4>Your danger windows</h4>
    <ul><li>Late at night, in bed, with the phone.</li>
    <li>Bored and alone at home.</li>
    <li>Straight after stress: a bad call, a rejection, a long day.</li>
    <li>For sugar: chai time, straight after meals, at office treats and family functions.</li></ul>
    <p>The Stats tab shows the hours when your urges actually hit. After a week, plan around them.</p>
    <h4>Urge surfing (what the SOS button does)</h4>
    <ol><li>Change your physical state: stand up, leave the room, use your legs.</li>
    <li>Cold water and slow breathing, to calm your body down.</li>
    <li>Remind yourself why you're doing this.</li>
    <li>Name the trigger. Naming it takes some of its power away.</li>
    <li>Wait out the timer somewhere you won't act on it.</li></ol>` },
  { t: "If you slip", html: `
    <p>The real danger isn't the slip. It's the <b>\"what the hell\" effect</b>: \"I've already ruined it, so I might as well binge and start fresh on Monday.\" That turns one bad hour into a lost week.</p>
    <ol><li><b>Log it honestly</b>, today, with the trigger.</li>
    <li><b>Change one thing tonight</b> that would have stopped it. Phone out of the room, the filter back on, sweets out of the house.</li>
    <li><b>Never miss twice.</b> The next 24 hours matter more than the slip did.</li>
    <li>Don't restart the 30 days. Your streak resets, but the plan keeps going. Clean days out of 30 is the number that counts.</li></ol>
    <p class="callout warn">If you slip on the same trigger 3 times, the plan for that trigger isn't working. Change the environment, not your willpower.</p>` },
  { t: "What to expect, honestly", html: `
    <h4>Porn and nut</h4>
    <ul><li>Week 1 to 2: strong urges, especially at night. This is normal.</li>
    <li>Some people report a \"flatline\": low desire and a flat mood for a few days. It's widely reported but not well studied, and it passes.</li>
    <li>What you can realistically expect: time back, less compulsive phone use, better sleep (mainly from the phone being out of the bedroom), and the feeling that you're in control instead of the habit.</li>
    <li>What not to expect: \"superpowers\". The testosterone claim comes from one small 2003 study that found a short spike around day 7, which then returned to normal. Don't do this for a hormone glow-up.</li></ul>
    <h4>Sugar</h4>
    <ul><li>Days 2 to 5: the strongest cravings, and sometimes a headache or low energy.</li>
    <li>Week 2 onward: cravings drop sharply and fruit starts to taste sweeter.</li>
    <li>It helps your fat-loss plan directly. Liquid sugar and sweets are the easiest calories to cut.</li></ul>` },
  { t: "Sugar: hidden names and Indian swaps", html: `
    <h4>On labels, these all mean sugar</h4>
    <p>Sugar, sucrose, glucose, fructose, dextrose, maltose, corn syrup, high-fructose corn syrup, invert syrup, liquid glucose, maltodextrin, cane sugar, jaggery, honey, fruit juice concentrate.</p>
    <p class="callout">Rule of thumb: if any of these is in the first three ingredients, put it back.</p>
    <h4>Swaps</h4>
    <dl><dt>Chai with sugar</dt><dd>Chai without sugar, or with a zero-cal sweetener. Your taste adjusts in about 10 days.</dd>
    <dt>Biscuits with chai</dt><dd>Roasted chana or makhana.</dd>
    <dt>Cold drink or juice</dt><dd>Soda water with lime and salt, or chaas.</dd>
    <dt>Sweet after dinner</dt><dd>One whole fruit, or warm milk with cinnamon and no sugar.</dd>
    <dt>Sweet lassi</dt><dd>Salted lassi or chaas.</dd>
    <dt>Mithai at a function</dt><dd>Eat a proper meal before you go, then say \"no thanks, I'm off sugar this month\". People accept it.</dd></dl>` },
];
