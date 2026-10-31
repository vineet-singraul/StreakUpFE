import { useAuth } from './AuthContext';

export const LANG_KEY = 'ht_lang';
export const LANGS = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'hinglish', label: 'Hinglish' },
];

// key: [English, Hindi, Hinglish]
const D = {
  'nav.calendar': ['Calendar', 'कैलेंडर', 'Calendar'],
  'nav.today': ['Today', 'आज', 'Aaj'],
  'nav.reports': ['AI Reports', 'AI रिपोर्ट', 'AI Reports'],
  'nav.challenge': ['Challenge', 'चैलेंज', 'Challenge'],
  'ch.newTitle': ['Start a new challenge', 'नया चैलेंज शुरू करें', 'Naya challenge shuru karo'],
  'ch.newSub': ['Choose 10 to 90 days, give it a title and write your rules (one per line). Tick them every day and earn points.', '10 से 90 दिन चुनें, टाइटल दें और अपने नियम लिखें (हर लाइन में एक)। रोज़ टिक करें और पॉइंट कमाएँ।', '10 se 90 din chuno, title do aur apne rules likho (har line me ek). Roz tick karo aur points kamao.'],
  'ch.name': ['Challenge name', 'चैलेंज का नाम', 'Challenge ka naam'],
  'ch.rules': ['Rules (one per line)', 'नियम (हर लाइन में एक)', 'Rules (har line me ek)'],
  'ch.rulesHelp': ['Max 20 rules', 'ज़्यादा से ज़्यादा 20 नियम', 'Max 20 rules'],
  'ch.start': ['Start challenge from today', 'आज से चैलेंज शुरू करें', 'Aaj se challenge shuru karo'],
  'ch.started': ['Challenge started. Day 1! 🔥', 'चैलेंज शुरू! Day 1 🔥', 'Challenge shuru! Day 1 🔥'],
  'ch.confirmEnd': ['End this challenge and start a new one?', 'यह चैलेंज खत्म करके नया शुरू करें?', 'Ye challenge khatam karke naya shuru karna hai?'],
  'ch.new': ['New challenge', 'नया चैलेंज', 'Naya challenge'],
  'ch.day': ['Day', 'दिन', 'Day'],
  'ch.dayShort': ['D', 'D', 'D'],
  'ch.points': ['Points', 'पॉइंट', 'Points'],
  'ch.perfect': ['Perfect days', 'परफ़ेक्ट दिन', 'Perfect days'],
  'ch.today': ['Today', 'आज', 'Aaj'],
  'ch.rule': ['Rule', 'नियम', 'Rule'],
  'ch.rulesLine': ['+{tick} points per tick · +{bonus} bonus when every rule is done', 'हर टिक पर +{tick} पॉइंट · सारे नियम पूरे होने पर +{bonus} बोनस', 'Har tick par +{tick} points · Saare rules poore hone par +{bonus} bonus'],
  'ch.finished': ['Challenge complete! 🏁 Start a new one anytime.', 'चैलेंज पूरा! 🏁 कभी भी नया शुरू करें।', 'Challenge poora! 🏁 Kabhi bhi naya shuru karo.'],
  'ch.hint': ["Only today's column can be ticked. ✗ = missed day.", 'सिर्फ़ आज का कॉलम टिक हो सकता है। ✗ = छूटा दिन।', 'Sirf aaj ka column tick ho sakta hai. ✗ = chhoota din.'],
  'ch.edit': ['Edit', 'एडिट', 'Edit'],
  'ch.editTitle': ['Edit challenge', 'चैलेंज एडिट करें', 'Challenge edit karo'],
  'ch.editHint': ['Renamed rules keep their ticks. New rules start empty.', 'नाम बदलने पर पुराने टिक बने रहेंगे। नए नियम खाली शुरू होंगे।', 'Naam badalne par purane tick rahenge. Naye rules khaali shuru honge.'],
  'ch.addRule': ['Add rule', 'नियम जोड़ें', 'Rule add karo'],
  'ch.save': ['Save', 'सेव करें', 'Save'],
  'ch.cancel': ['Cancel', 'रद्द करें', 'Cancel'],
  'ch.saved': ['Challenge updated', 'चैलेंज अपडेट हो गया', 'Challenge update ho gaya'],
  'ch.history': ['History', 'हिस्ट्री', 'History'],
  'ch.historyTitle': ['Challenge history', 'चैलेंज हिस्ट्री', 'Challenge history'],
  'ch.historyEmpty': ['No challenges yet.', 'अभी कोई चैलेंज नहीं।', 'Abhi koi challenge nahi.'],
  'ch.rulesCount': ['rules', 'नियम', 'rules'],
  'ch.active': ['Running', 'चल रहा है', 'Chal raha hai'],
  'ch.completed': ['Completed', 'पूरा', 'Poora'],
  'ch.ended': ['Ended early', 'बीच में बंद', 'Beech me band'],
  'ch.back': ['Back', 'वापस', 'Back'],
  'ch.dayOf': ['Day {d} of {n}', 'दिन {d} / {n}', 'Day {d} / {n}'],
  'ch.todayList': ["Today's checklist · Day {d}", 'आज की चेकलिस्ट · दिन {d}', 'Aaj ki checklist · Day {d}'],
  'ch.grid': ['{n}-day progress', '{n} दिन की प्रगति', '{n} din ka progress'],
  'ch.lineTitle': ['Daily completion trend', 'रोज़ की प्रगति का ट्रेंड', 'Daily completion trend'],
  'ch.lineSub': ['% of rules done each day · Average {avg}%', 'हर दिन पूरे हुए नियमों का % · औसत {avg}%', 'Har din poore rules ka % · Average {avg}%'],
  'ch.days': ['Days', 'दिन', 'Days'],
  'ch.daysHelp': ['Between 10 and 90', '10 से 90 के बीच', '10 se 90 ke beech'],
  'ch.daysError': ['Enter days from 10 to 90', '10 से 90 के बीच दिन डालें', '10 se 90 ke beech din daalo'],
  'ch.titleError': ['Title is required', 'टाइटल ज़रूरी है', 'Title zaroori hai'],
  'ch.end': ['End challenge', 'चैलेंज खत्म करें', 'Challenge khatam karo'],
  'ch.confirmEndOne': ['End "{title}"? It will move to History.', '"{title}" खत्म करें? यह हिस्ट्री में चला जाएगा।', '"{title}" khatam karna hai? Ye History me chala jayega.'],
  'ch.resume': ['Continue this challenge', 'यह चैलेंज जारी रखें', 'Ye challenge continue karo'],
  'ch.resumed': ['Challenge is running again 🔥', 'चैलेंज फिर से चालू 🔥', 'Challenge phir se chalu 🔥'],
  'ch.nDay': ['{n} Day Challenge', '{n} दिन का चैलेंज', '{n} Day Challenge'],
  'nav.settings': ['Settings', 'सेटिंग्स', 'Settings'],
  logout: ['Logout', 'लॉग आउट', 'Logout'],

  'login.hero': ['Build habits that stick.', 'ऐसी आदतें बनाएँ जो टिकें।', 'Aisi habits banao jo tike.'],
  'login.heroSub': ['Write daily tasks, tick them off, and get an honest AI report.', 'रोज़ के काम लिखें, टिक करें, और AI से सच्ची रिपोर्ट पाएँ।', 'Roz ke tasks likho, tick karo, aur AI se honest report pao.'],
  'login.f1': ['Monthly calendar with daily tasks & habit ticks', 'रोज़ के काम और आदतों के टिक के साथ मासिक कैलेंडर', 'Daily tasks aur habit ticks ke saath monthly calendar'],
  'login.f2': ['Gemini AI report every night at 12 AM', 'हर रात 12 बजे Gemini AI रिपोर्ट', 'Har raat 12 baje Gemini AI report'],
  'login.f3': ['Reminders every hour (browser + Gmail)', 'हर घंटे रिमाइंडर (ब्राउज़र + Gmail)', 'Har ghante reminders (browser + Gmail)'],
  'login.welcome': ['Welcome back! Sign in to continue.', 'वापसी पर स्वागत है! आगे बढ़ने के लिए साइन इन करें।', 'Welcome back! Aage badhne ke liye Sign In karo.'],
  'login.create': ['Create your account in one click.', 'एक क्लिक में अपना अकाउंट बनाएँ।', 'Ek click me apna account banao.'],
  'login.new': ['New here? ', 'नया अकाउंट? ', 'Naya account? '],
  'login.have': ['Already have an account? ', 'पहले से अकाउंट है? ', 'Pehle se account hai? '],
  'login.failed': ['Google login was cancelled or failed', 'Google लॉगिन रद्द या असफल हुआ', 'Google login cancel / fail ho gaya'],

  'dash.hello': ['Hello, {name} 👋', 'नमस्ते, {name} 👋', 'Namaste, {name} 👋'],
  'dash.sub': ["Finish today's tasks and tick your habits.", 'आज के काम पूरे करें और आदतों पर टिक लगाएँ।', 'Aaj ke tasks complete karo aur habits tick karo.'],
  'month.lockedTip': ["This month hasn't started yet", 'यह महीना अभी शुरू नहीं हुआ', 'Ye month abhi shuru nahi hua'],
  'month.locked': ['This month is locked', 'यह महीना अभी लॉक है', 'Ye month abhi locked hai'],
  'month.lockedSub': ['It opens automatically when the month starts.', 'महीना शुरू होते ही यह अपने आप खुल जाएगा।', 'Month shuru hone par ye apne aap open ho jayega.'],

  'today.label': ['Today', 'आज', 'Today'],
  'today.done': ['{done}/{total} tasks done', '{done}/{total} काम पूरे', '{done}/{total} tasks done'],
  'today.none': ['No tasks added for today yet', 'आज के काम अभी नहीं जोड़े', 'Aaj ke tasks abhi add nahi kiye'],
  'today.open': ['Open today', 'आज खोलें', 'Open today'],
  'today.add': ['Add tasks', 'काम जोड़ें', 'Add tasks'],
  'cal.allDone': ['All done', 'सब पूरे', 'Sab done'],

  'habits.title': ['Monthly Habits', 'मासिक आदतें', 'Monthly Habits'],
  'habits.copy': ['Last month', 'पिछला महीना', 'Last month'],
  'habits.placeholder': ['New habit, e.g. Gym, Reading 20 min, Water 3L', 'नई आदत, जैसे जिम, 20 मिनट पढ़ना, 3L पानी', 'Nayi habit, jaise Gym, Reading 20 min, Water 3L'],
  'habits.emptyEdit': ['Add your first habit 👆', 'अपनी पहली आदत जोड़ें 👆', 'Apni pehli habit add karo 👆'],
  'habits.emptyPast': ['No habits this month.', 'इस महीने कोई आदत नहीं थी।', 'Is month me koi habit nahi thi.'],
  'habits.header': ['Habit', 'आदत', 'Habit'],
  'habits.todayTick': ["Today's tick", 'आज का टिक', 'Aaj ka tick'],
  'habits.hint': ["Only today's column can be ticked. On mobile, scroll the table sideways.", 'सिर्फ़ आज का कॉलम टिक हो सकता है। मोबाइल पर टेबल को साइड में स्क्रॉल करें।', 'Sirf aaj ka column tick ho sakta hai. Mobile par table ko side me scroll karo.'],
  'habits.confirmDelete': ['Delete "{name}"?', '"{name}" हटाना है?', '"{name}" delete karna hai?'],
  'habits.copied': ['{n} habit(s) copied', '{n} आदतें कॉपी हुईं', '{n} habit(s) copy ho gayi'],
  'habits.nothingToCopy': ['No habits to copy from last month', 'पिछले महीने से कॉपी करने को कोई आदत नहीं', 'Pichle month me copy karne layak habit nahi mili'],

  'day.readOnly': ['Read only', 'सिर्फ़ देखने के लिए', 'Read only'],
  'day.completed': ['{done}/{total} completed', '{done}/{total} पूरे', '{done}/{total} completed'],
  'day.placeholder': ["Write today's task...", 'आज का काम लिखें...', 'Aaj ka task likho...'],
  'day.add': ['Add', 'जोड़ें', 'Add'],
  'day.emptyEdit': ["No tasks yet. Add all of today's tasks above.", 'अभी कोई काम नहीं। ऊपर से आज के सारे काम जोड़ें।', 'Abhi koi task nahi. Upar se apne aaj ke saare tasks add karo.'],
  'day.emptyPast': ['No tasks on this day.', 'इस दिन कोई काम नहीं था।', 'Is din koi task nahi tha.'],
  'day.aiTitle': ['🤖 AI Report', '🤖 AI रिपोर्ट', '🤖 AI Report'],
  'day.aiInfo': ['The final report is created automatically at 12 AM and emailed too. To see progress so far:', 'फ़ाइनल रिपोर्ट रात 12 बजे अपने आप बनेगी और ईमेल पर भी आएगी। अभी तक की प्रगति देखने के लिए:', 'Final report raat 12 baje apne aap banegi aur Gmail par bhi aayegi. Abhi tak ka progress dekhna hai to:'],
  'day.generating': ['Gemini is writing your report...', 'Gemini रिपोर्ट बना रहा है...', 'Gemini report bana raha hai...'],
  'day.generate': ['Generate AI report now', 'अभी AI रिपोर्ट बनाएँ', 'Generate AI report now'],
  'day.noReport': ['No report was generated for this day.', 'इस दिन की रिपोर्ट नहीं बनी।', 'Is din ki report abhi generate nahi hui.'],
  'day.goToday': ['Go to today', 'आज पर जाएँ', 'Go to today'],
  'day.doneToast': ['Great! Task complete ✅', 'शाबाश! काम पूरा ✅', 'Shabash! Task complete ✅'],

  'rep.report': ['Report', 'रिपोर्ट', 'Report'],
  'rep.final': ['Final (12 AM)', 'फ़ाइनल (12 AM)', 'Final (12 AM)'],
  'rep.live': ['Live preview', 'लाइव प्रीव्यू', 'Live preview'],
  'rep.completed': ['Completed', 'पूरे हुए', 'Completed'],
  'rep.pending': ['Pending', 'बाकी', 'Pending'],
  'rep.none': ['None', 'कोई नहीं', 'None'],
  'rep.reason': ['Reason', 'कारण', 'Reason'],
  'rep.advice': ['💡 AI advice on your reasons', '💡 आपके कारणों पर AI सलाह', '💡 Aapke reasons par AI advice'],
  'rep.ask': ["Tell us why these weren't done", 'बताइए ये काम क्यों नहीं हुए', 'Batao tasks kyon nahi ho paaye'],

  'reports.sub': ['Every night at 12 AM, Gemini writes a report of your day.', 'हर रात 12 बजे Gemini आपके दिन की रिपोर्ट बनाता है।', 'Har raat 12 baje Gemini aapke din ki report banata hai.'],
  'reports.noAi': ['Gemini API key is not set, so a basic report is used. Add GEMINI_API_KEY in Backend/.env.', 'Gemini API key सेट नहीं है, इसलिए साधारण रिपोर्ट बन रही है। Backend/.env में GEMINI_API_KEY डालें।', 'Gemini API key set nahi hai. Abhi basic report ban rahi hai. Backend/.env me GEMINI_API_KEY daalo.'],
  'reports.days': ['Days tracked', 'ट्रैक किए दिन', 'Days tracked'],
  'reports.tasksDone': ['Tasks done', 'पूरे काम', 'Tasks done'],
  'reports.completion': ['Completion', 'पूर्णता', 'Completion'],
  'reports.perfect': ['Perfect days', 'परफ़ेक्ट दिन', 'Perfect days'],
  'reports.emptyTitle': ['No reports yet', 'अभी कोई रिपोर्ट नहीं', 'Abhi koi report nahi hai'],
  'reports.emptySub': ['Add tasks today. Your first report arrives at 12 AM.', 'आज काम जोड़ें। पहली रिपोर्ट रात 12 बजे आएगी।', 'Aaj tasks add karo. Raat 12 baje pehli report aa jayegi.'],

  'chart.monthTitle': ['{month}: daily progress', '{month}: रोज़ की प्रगति', '{month}: daily progress'],
  'chart.last30': ['Last 30 days', 'पिछले 30 दिन', 'Last 30 days'],
  'chart.sub': ['Daily task completion %', 'रोज़ के काम पूरे होने का %', 'Roz ka task completion %'],
  'chart.summary': ['Average {avg}% · {n} days tracked · Best {best}% on {date}', 'औसत {avg}% · {n} दिन ट्रैक · सबसे अच्छा {best}% ({date})', 'Average {avg}% · {n} din tracked · Best {best}% on {date}'],
  'chart.empty': ['No data yet. Add tasks and bars will appear here.', 'अभी डेटा नहीं है। काम जोड़ें, बार यहाँ दिखेंगे।', 'Abhi data nahi hai. Tasks add karo, bars yahan dikhenge.'],
  'chart.date': ['Date', 'तारीख', 'Date'],
  'chart.done': ['Done', 'पूरे', 'Done'],
  'chart.total': ['Total', 'कुल', 'Total'],
  'chart.tip': ['{done}/{total} done · {pct}%', '{done}/{total} पूरे · {pct}%', '{done}/{total} done · {pct}%'],
  'chart.upcoming': ['Upcoming day', 'आने वाला दिन', 'Abhi aane wala din'],
  'chart.noTasks': ['No tasks', 'कोई काम नहीं', 'Koi task nahi'],

  'why.title': ["Why weren't these done? 🤔", 'ये काम क्यों नहीं हुए? 🤔', 'Ye tasks kyon nahi ho paaye? 🤔'],
  'why.intro': ['{date}: you completed {done}/{total} tasks. Write an honest reason and AI will give you a better plan for tomorrow.', '{date}: आपने {done}/{total} काम पूरे किए। सच्चा कारण लिखें, AI कल के लिए बेहतर प्लान देगा।', '{date}: aapne {done}/{total} tasks complete kiye. Honest reason likho, AI aapko kal ke liye better plan dega.'],
  'why.placeholder': ["Why couldn't you do it?", 'क्यों नहीं हो पाया?', 'Kyon nahi ho paaya?'],
  'why.later': ['Later', 'बाद में', 'Baad me'],
  'why.submit': ['Submit & get AI advice', 'भेजें और AI सलाह लें', 'Submit & AI advice lo'],
  'why.thinking': ['AI is thinking...', 'AI सोच रहा है...', 'AI soch raha hai...'],
  'why.saved': ['Reasons saved', 'कारण सेव हो गए', 'Reasons save ho gaye'],
  'why.done': ['Done', 'ठीक है', 'Done'],

  'notify.text': ["Turn on browser notifications to get hourly task reminders (even if email doesn't arrive).", 'हर घंटे काम का रिमाइंडर पाने के लिए ब्राउज़र नोटिफ़िकेशन चालू करें (ईमेल न आए तब भी मिलेगा)।', 'Har ghante task reminder pane ke liye browser notifications ON karo (email na aaye tab bhi milega).'],
  'notify.enable': ['Enable', 'चालू करें', 'Enable'],
  'notify.on': ['Notifications turned on 🔔', 'नोटिफ़िकेशन चालू हो गए 🔔', 'Notifications ON ho gaye 🔔'],

  'set.language': ['Language', 'भाषा', 'Language'],
  'set.languageSub': ['App text and AI reports will use this language.', 'ऐप का टेक्स्ट और AI रिपोर्ट इसी भाषा में होंगे।', 'App ka text aur AI reports isi language me honge.'],
  'set.saved': ['Language changed', 'भाषा बदल गई', 'Language badal gayi'],
  'set.reminders': ['Reminders (every 30 minutes)', 'रिमाइंडर (हर 30 मिनट)', 'Reminders (har 30 minute)'],
  'set.remindersSub': ["A browser notification every 30 minutes about today's tasks.", 'आज के कामों के बारे में हर 30 मिनट में ब्राउज़र नोटिफ़िकेशन।', 'Aaj ke tasks ke baare me har 30 minute browser notification.'],
  'set.push': ['Browser notifications', 'ब्राउज़र नोटिफ़िकेशन', 'Browser notifications'],
  'set.pushUnsupported': ["This browser doesn't support it", 'यह ब्राउज़र सपोर्ट नहीं करता', 'Ye browser support nahi karta'],
  'set.pushDenied': ['Blocked. Allow it from the browser site settings.', 'ब्लॉक है। ब्राउज़र की साइट सेटिंग्स से Allow करें।', 'Blocked hai. Browser site settings se Allow karo.'],
  'set.pushOn': ['On for this device', 'इस डिवाइस पर चालू है', 'Is device par ON hai'],
  'set.pushOff': ['Off for this device', 'इस डिवाइस पर बंद है', 'Is device par abhi OFF hai'],
  'set.gmail': ['Gmail reminders', 'Gmail रिमाइंडर', 'Gmail reminders'],
  'set.gmailSub': ['Reminders + 12 AM report to {email}', 'रिमाइंडर + 12 बजे की रिपोर्ट {email} पर', 'Reminder + 12 AM report {email} par'],
  'set.test': ['Send a test reminder now', 'अभी टेस्ट रिमाइंडर भेजें', 'Abhi test reminder bhejo'],
};

const IDX = { en: 0, hi: 1, hinglish: 2 };

export function storedLang() {
  try {
    return localStorage.getItem(LANG_KEY) || 'hinglish';
  } catch {
    return 'hinglish';
  }
}

export function translate(lang, key, vars) {
  const row = D[key];
  let s = row ? row[IDX[lang] ?? 2] : key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, v);
  return s;
}

/** const t = useT(); t('day.add') / t('today.done', { done, total }) */
export function useT() {
  const { user } = useAuth();
  const lang = user?.language || storedLang();
  return (key, vars) => translate(lang, key, vars);
}
