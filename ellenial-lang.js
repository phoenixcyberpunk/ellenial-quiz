/*! ellenial-lang.js for ellenial quiz · AGPL-3.0
 * Every Ellenial app comes in Swedish and English (decided by Ellen, 8 Nov 2026).
 * Quiz is written in Swedish; this file holds the English. tx('Svensk text') returns the text in the
 * chosen language. A key ending in '#pl' is a plural that's the same as the singular in Swedish
 * ('lag' / 'lag#pl') but not in English ('team' / 'teams'); the '#pl' never shows.
 * The choice follows the phone's language until someone taps the switch, and is then saved on this
 * phone only (localStorage `eq:lang`). Test with ?lang=sv or ?lang=en (not saved).
 * Switching reloads the page, so it's only offered on the start page.
 * The built-in quiz (Vattendrag) and people's own quizzes are never translated: they're content.
 */
;(function () {
  'use strict'
  var KEY = 'eq:lang'
  function saved() { try { var v = localStorage.getItem(KEY); return v === 'sv' || v === 'en' ? v : null } catch (e) { return null } }
  function fromPhone() {
    var n = (navigator.languages && navigator.languages[0]) || navigator.language || 'sv'
    return /^(sv|nb|nn|no|da)\b/i.test(n) ? 'sv' : 'en'
  }
  var url = null
  try { url = new URLSearchParams(location.search).get('lang') } catch (e) {}
  var lang = url === 'sv' || url === 'en' ? url : saved() || fromPhone()
  document.documentElement.lang = lang

  var EN = {
    // start page
    'Vad ska vi quizza om idag?': 'What shall we quiz about today?',
    'Nytt': 'New',
    'fråga': 'question',
    'frågor': 'questions',
    ' + bonusrunda': ' + bonus round',
    'Spela': 'Play',
    'Skriv ut': 'Print',
    'Egna quiz': 'Your own quizzes',
    'Skapa eget quiz': 'Make your own quiz',
    'Öppna ett quiz-PDF': 'Open a quiz PDF',
    'Egna quiz sparas inte här. De finns bara i PDF:en du laddar ner, och den kan du öppna här igen när du vill spela eller ändra.': 'Your own quizzes aren’t saved here. They live only in the PDF you download, and you can open it here again whenever you want to play or change it.',
    'Inget konto. Inget sparas hos mig.': 'No account. Nothing is saved with me.',
    'Egna quiz finns bara i PDF:en du laddar ner.': 'Your own quizzes live only in the PDF you download.',
    'Så fungerar det': 'How this works',
    'Öppen källkod': 'Open source',
    'Tillbaka': 'Back',
    'Tema': 'Theme',
    'Auto': 'Auto',
    'Ljust': 'Light',
    'Mörkt': 'Dark',
    'Mitt quiz': 'My quiz',
    'Bonusrunda': 'Bonus round',
    'Kopiera länken:': 'Copy the link:',

    // one-time notice for quizzes saved in the browser
    'Dina quiz flyttar till PDF': 'Your quizzes are moving to PDF',
    'Från och med nu sparas inga quiz i webbläsaren. Du har ': 'From now on, no quizzes are saved in the browser. You have ',
    'quiz#pl': 'quizzes',
    ' sparade här. Ladda ner dem som PDF så har du kvar dem och kan öppna dem här igen.': ' saved here. Download them as PDFs to keep them; you can open them here again.',
    'Namnlöst quiz': 'Untitled quiz',
    ' nedladdade. Kolla att filerna finns innan du tar bort dem här.': ' downloaded. Check that the files are there before you remove them here.',
    'Inga av dem var klara att spela, så det fanns inget att ladda ner.': 'None of them were ready to play, so there was nothing to download.',
    'Ladda ner som PDF': 'Download as PDF',
    'Ladda ner båda som PDF': 'Download both as PDFs',
    'Ladda ner alla som PDF': 'Download all as PDFs',
    'Klar, ta bort dem härifrån': 'Done, remove them from here',
    'Inget tas bort förrän du trycker där.': 'Nothing is removed until you tap that.',

    // privacy page
    'Delad skärm': 'Shared screen',
    'Allt händer i den här webbläsaren. Inget skickas någonstans.': 'Everything happens in this browser. Nothing is sent anywhere.',
    'Med mobiler': 'With phones',
    'Mobilerna pratar med den delade skärmen genom Supabase Realtime. Meddelandena passerar bara förbi och sparas inte. De är också krypterade med en nyckel som bara finns i länken efter #, så inte ens servern kan läsa namn eller svar.': 'The phones talk to the shared screen through Supabase Realtime. The messages only pass through and are never saved. They’re also encrypted with a key that only exists in the link after #, so not even the server can read names or answers.',
    'När quizet avslutas eller fliken stängs försvinner allt: namn, svar och poäng.': 'When the quiz ends or the tab closes, everything is gone: names, answers and points.',
    'Sparas aldrig här. Ett eget quiz finns bara i PDF:en du laddar ner. Den görs på telefonen och bär hela quizet, så du kan öppna den här igen för att spela eller ändra. Inget skickas till någon server.': 'Never saved here. Your own quiz lives only in the PDF you download. It’s made on your phone and carries the whole quiz, so you can open it here again to play or change it. Nothing is sent to any server.',
    'Kostnader': 'Costs',
    'En statisk sida på Vercel och Supabase gratisnivå, samma som mina andra appar. Alltså nära noll kronor.': 'A static page on Vercel and Supabase’s free tier, same as my other apps. So close to nothing.',
    'Källor': 'Sources',
    'Siffrorna i bonusrundan om vattendrag kommer från ': 'The figures in the bonus round about waterways come from ',
    ' (CC BY 4.0).': ' (CC BY 4.0).',
    'Gjord av Ellen, en person, med Claude som hjälp med koden. Öppen källkod (AGPL-3.0).': 'Made by Ellen, one person, with Claude helping with the code. Open source (AGPL-3.0).',

    // setup
    'Lag': 'Teams',
    'Lag ': 'Team ',
    'Lag 1': 'Team 1',
    'Ta bort ': 'Remove ',
    '+ Lag': '+ Team',
    'Tryck på ett namn för att ändra det. Ni skriver svaren på lapp eller ropar, och på svarsskärmen trycker du på lagen som hade rätt.': 'Tap a name to change it. You write the answers on paper or shout them out, and on the answer screen you tap the teams that got it right.',
    'Hur spelar ni?': 'How are you playing?',
    'En delad skärm': 'One shared screen',
    'Frågorna på tv:n eller projektorn. Ni svarar i lag, högt eller på lapp.': 'The questions on the TV or projector. You answer in teams, out loud or on paper.',
    'Var och en på mobilen': 'Everyone on their phone',
    'Frågorna på den delade skärmen, alla svarar på sin egen mobil via en QR-kod. Poängen räknas automatiskt.': 'The questions on the shared screen; everyone answers on their own phone via a QR code. Points are counted automatically.',
    'Tid per fråga': 'Time per question',
    'Ingen': 'None',
    'Starta på den delade skärmen': 'Start on the shared screen',
    'Öppna gärna sidan på datorn som är kopplad till tv:n eller projektorn.': 'Best opened on the computer that’s connected to the TV or projector.',
    'Forsen': 'The Rapids',
    'Biflödet': 'The Tributary',
    'Kanalen': 'The Canal',
    'Källan': 'The Spring',
    'Jokken': 'The Brook',
    'Strömmen': 'The Current',

    // shared screen
    'Helskärm': 'Full screen',
    'Ansluten': 'Connected',
    'Ansluter …': 'Connecting …',
    ' av ': ' of ',
    ' har svarat': ' have answered',
    'Alla har svarat · Visa svaret': 'Everyone has answered · Show the answer',
    'Avsluta quizet? Poängen försvinner.': 'End the quiz? The points will be gone.',
    'Avsluta': 'End',
    ' sekunder per fråga': ' seconds per question',
    'Första frågan': 'First question',
    'QR-kod för att gå med': 'QR code to join',
    'QR-koden kunde inte ritas. Använd länken.': 'The QR code couldn’t be drawn. Use the link.',
    'Gå med på mobilen': 'Join on your phone',
    'Rikta kameran mot QR-koden': 'Point your camera at the QR code',
    'Skriv ditt namn': 'Type your name',
    'Vänta här, frågorna kommer på den här skärmen': 'Wait here, the questions will show on this screen',
    'Länken är kopierad': 'Link copied',
    'Kopiera länken, t.ex. till chatten': 'Copy the link, e.g. into the group chat',
    ' är med': ' joined',
    'Ingen har gått med än': 'Nobody has joined yet',
    'Starta quizet': 'Start the quiz',
    'Bonusfråga ': 'Bonus question ',
    'Fråga ': 'Question ',
    'Sant': 'True',
    'Falskt': 'False',
    'Tryck på orden i rätt ordning på mobilen.': 'Tap the words in the right order on your phone.',
    'Skriv bokstäverna i rätt ordning, till exempel ': 'Write the letters in the right order, for example ',
    'Svara på mobilen.': 'Answer on your phone.',
    'Visa svaret': 'Show the answer',
    'Tid kvar': 'Time left',
    ' fick hela ordningen rätt': ' got the whole order right',
    'Rätt svar: ': 'Right answer: ',
    'Vilka lag hade rätt? Tryck för att ge poäng': 'Which teams got it right? Tap to give points',
    'Rätt ordning': 'Right order',
    'Kuggfråga': 'Trick question',
    'Visste du?': 'Did you know?',
    'Visa resultatet': 'Show the results',
    'Till bonusrundan': 'On to the bonus round',
    'Nästa fråga': 'Next question',
    'Flest rätt idag': 'Most right today',
    ' rätt': ' right',
    'Topp 3': 'Top 3',
    'Tillsammans fick ni ': 'Together you got ',
    ' rätt. Alla ser sitt eget resultat på mobilen.': ' right. Everyone sees their own result on their phone.',
    'Klart! Bra flytet.': 'Done! That went swimmingly.',
    ' och ': ' and ',
    'lag': 'team',
    'lag#pl': 'teams',
    'spelare': 'player',
    'spelare#pl': 'players',
    'Resultaten försvinner när ni avslutar eller stänger sidan.': 'The results are gone when you end or close the page.',
    'Spela igen': 'Play again',
    'Tiden är ute · Visa svaret': 'Time’s up · Show the answer',

    // phone
    'Svaret har kommit fram. Du kan ändra dig tills tiden är ute.': 'Your answer arrived. You can change your mind until time’s up.',
    'Skickar …': 'Sending …',
    'Tack för att du spelade!': 'Thanks for playing!',
    'Quizet är slut. Inget av det sparas.': 'The quiz is over. None of it is saved.',
    'Till quiz.ellenial.app': 'Go to quiz.ellenial.app',
    'Ditt namn eller smeknamn': 'Your name or nickname',
    'Gå med i quizet': 'Join the quiz',
    'Vad heter du?': 'What’s your name?',
    'Gå med': 'Join',
    'Namnet syns bara för dem som är med i quizet, och glöms bort när quizet slutar.': 'Your name is only seen by the people in the quiz, and is forgotten when the quiz ends.',
    'Ansluter till skärmen …': 'Connecting to the screen …',
    'Se till att den delade skärmen har quizet öppet.': 'Make sure the shared screen has the quiz open.',
    'rätt': 'right',
    'Du är med, ': 'You’re in, ',
    'Titta på den delade skärmen. Frågorna kommer snart.': 'Look at the shared screen. The questions are coming soon.',
    'Klart!': 'Done!',
    'Du fick ': 'You got ',
    ' rätt av ': ' right out of ',
    'Du är bland dem med flest rätt idag. Snyggt!': 'You’re among those with the most right today. Nice!',
    'Bra jobbat. Nu kan du fler ord för vatten än i morse.': 'Well done. Now you know more words for water than you did this morning.',
    'Huvudsaken är att man är med. Nästa gång!': 'Taking part is what counts. Next time!',
    'Ditt resultat syns bara här, och försvinner när quizet slutar.': 'Your result only shows here, and is gone when the quiz ends.',
    'Titta på skärmen': 'Look at the screen',
    'Bonusfråga': 'Bonus question',
    'Tiden är ute': 'Time’s up',
    'Ditt svar är med. Titta på skärmen.': 'Your answer is in. Look at the screen.',
    'Inget svar den här gången. Det gör inget!': 'No answer this time. That’s fine!',
    'Tryck på orden i rätt ordning, från första till sista.': 'Tap the words in the right order, from first to last.',
    'Börja om': 'Start over',
    'Rätt!': 'Right!',
    'Inte den här gången': 'Not this time',
    'Inget svar': 'No answer',
    'Svar: ': 'Answer: ',
    'Nästa fråga kommer på skärmen.': 'The next question will show on the screen.',
    'Länken till quizet gick inte att läsa. Skanna QR-koden på skärmen igen.': 'The link to the quiz couldn’t be read. Scan the QR code on the screen again.',

    // editor
    'Så visas den när ni spelar': 'How it shows when you play',
    'Blanda varje gång': 'Shuffle every time',
    'Fast ordning': 'Fixed order',
    'Ny blandning varje gång ni spelar. På papper blir den alltid likadan.': 'A new shuffle every time you play. On paper it’s always the same.',
    'Samma ordning på skärmen, i mobilerna och på papper. Bra om du skriver ut svarsblad och kör på skärmen samtidigt.': 'Same order on the screen, on the phones and on paper. Good if you print answer sheets and use the screen at the same time.',
    'Plats ': 'Place ',
    'Flytta ': 'Move ',
    ' upp': ' up',
    ' ner': ' down',
    'Obs: nu visas den i rätt ordning, så svaret syns direkt.': 'Note: it now shows in the right order, so the answer is visible straight away.',
    'Nedladdad. Öppna PDF:en här igen för att spela eller ändra.': 'Downloaded. Open the PDF here again to play or change it.',
    'Fyll i minst en hel fråga först.': 'Fill in at least one whole question first.',
    '1 fråga är inte klar och hoppas över.': '1 question isn’t finished and will be skipped.',
    ' frågor är inte klara och hoppas över.': ' questions aren’t finished and will be skipped.',
    'Svar (markera det rätta)': 'Answers (mark the right one)',
    'Svar ': 'Answer ',
    'Ta bort svar ': 'Remove answer ',
    '+ Svar': '+ Answer',
    'Skriv i rätt ordning. Det är svaret.': 'Write them in the right order. That’s the answer.',
    'Skriv i rätt ordning. De blandas när ni spelar.': 'Write them in the right order. They’re shuffled when you play.',
    'Först': 'First',
    'Sist': 'Last',
    'Ta bort plats ': 'Remove place ',
    '+ Plats': '+ Place',
    'Rätt svar': 'Right answer',
    'Flytta upp': 'Move up',
    'Flytta ner': 'Move down',
    'Ta bort fråga ': 'Remove question ',
    'Frågetyp': 'Question type',
    'Flerval': 'Multiple choice',
    'Sortera': 'Put in order',
    'Sant/falskt': 'True/false',
    'Frågan': 'The question',
    'T.ex. Sortera från minst till störst': 'E.g. Sort from smallest to biggest',
    'Ett påstående som är sant eller falskt': 'A statement that’s true or false',
    'Skriv frågan': 'Write the question',
    'Visste du? (valfritt, visas med svaret)': 'Did you know? (optional, shown with the answer)',
    'Nytt quiz': 'New quiz',
    'Namn på quizet': 'Name of the quiz',
    'T.ex. Fredagsfika-quizet': 'E.g. The Friday coffee quiz',
    '+ Lägg till fråga': '+ Add a question',
    'Spara ditt quiz': 'Save your quiz',
    'Quizet sparas inte här. Ladda ner PDF:en innan du stänger, annars är det borta. Öppna PDF:en här igen för att spela eller ändra.': 'The quiz isn’t saved here. Download the PDF before you close, or it’s gone. Open the PDF here again to play or change it.',
    'Vilken version': 'Which version',
    'Med svar': 'With answers',
    'Svarsblad till lagen': 'Answer sheets for the teams',
    'Ladda ner PDF': 'Download PDF',
    'Se hur PDF:en ser ut': 'See what the PDF looks like',
    'Båda versionerna går att öppna här igen.': 'Both versions can be opened here again.',
    'Ladda ner quizet först?': 'Download the quiz first?',
    'Du har inte laddat ner "': 'You haven’t downloaded "',
    '". Inget sparas här, så lämnar du nu är quizet borta.': '". Nothing is saved here, so if you leave now the quiz is gone.',
    'Stanna kvar': 'Stay',
    'Lämna utan att spara': 'Leave without saving',

    // opened from a PDF or an old link
    'Länken gick inte att läsa. Den kan ha blivit avklippt när den skickades. Be om den igen, eller be om quizets PDF.': 'The link couldn’t be read. It may have been cut off when it was sent. Ask for it again, or ask for the quiz’s PDF.',
    'Den filen är ingen quiz-PDF härifrån, så jag kunde inte läsa den.': 'That file isn’t a quiz PDF from here, so I couldn’t read it.',
    'Till startsidan': 'Back to the start',
    'Quizet är öppnat från en länk': 'The quiz is opened from a link',
    'Quizet är öppnat från din PDF': 'The quiz is opened from your PDF',
    'Ändra': 'Change',
    'Delningslänkar görs inte längre. Ladda ner quizet som PDF om du vill ha kvar det. Det kom i länken och har inte skickats till någon server.': 'Share links aren’t made any more. Download the quiz as a PDF if you want to keep it. It came in the link and hasn’t been sent to any server.',
    'Ändrar du något? Ladda ner en ny PDF när du är klar. Den gamla PDF:en ändras inte.': 'Changing something? Download a new PDF when you’re done. The old PDF doesn’t change.',

    // print and PDF
    'Frågeledarens version · med svar': 'Quiz host’s version · with answers',
    'Svarsblad': 'Answer sheet',
    'Lag: ______________________________': 'Team: ______________________________',
    'Sant eller falskt': 'True or false',
    '   (rätt svar)': '   (right answer)',
    'Rätt ordning: ': 'Right order: ',
    'Ordning: ': 'Order: ',
    'Visste du? ': 'Did you know? ',
    'Antal rätt: ______ av ': 'Right: ______ out of ',
    'Gjort med quiz · Ellenial · quiz.ellenial.app': 'Made with quiz · Ellenial · quiz.ellenial.app',
    'Sida ': 'Page ',
    'rätt svar': 'right answer',
    ' · Flerval': ' · Multiple choice',
    ' · Sant eller falskt': ' · True or false',
    ' · Sortera': ' · Put in order',
    'Förhandsvisning av utskriften': 'Print preview',
    '-med-svar': '-with-answers',
    '-svarsblad': '-answer-sheet',
    'Lag: ': 'Team: ',
    'Antal rätt: ': 'Right: ',
    'Gjort med quiz · Ellenial — quiz.ellenial.app': 'Made with quiz · Ellenial — quiz.ellenial.app',
    'Till dig som leder quizet: alla frågor med rätt svar och "Visste du?".': 'For you, the quiz host: every question with the right answer and "Did you know?".',
    'Till lagen: frågorna utan svar, med plats att skriva. Skriv ut ett per lag.': 'For the teams: the questions without answers, with room to write. Print one per team.',
    'PDF:en görs här på telefonen och skickas ingenstans. Skriv ut den, eller öppna den här igen för att spela.': 'The PDF is made here on your phone and sent nowhere. Print it, or open it here again to play.'
  }

  if (lang === 'en') {
    try {
      document.title = 'Quiz · Ellenial'
      var d = document.querySelector('meta[name="description"]')
      if (d) d.setAttribute('content', 'A free quiz to play together: on one shared screen or everyone on their own phone. No account, no ads, nothing saved.')
    } catch (e) {}
  }

  window.EllenialLang = {
    lang: lang,
    other: lang === 'sv' ? 'en' : 'sv',
    otherLabel: lang === 'sv' ? 'English' : 'Svenska',
    otherAria: lang === 'sv' ? 'Switch to English' : 'Byt till svenska',
    set: function (l) { try { localStorage.setItem(KEY, l) } catch (e) {} location.reload() }
  }
  window.tx = function (s) {
    if (lang === 'en' && Object.prototype.hasOwnProperty.call(EN, s)) return EN[s]
    return s.replace(/#pl$/, '')
  }
  window.tx.has = function (s) { return Object.prototype.hasOwnProperty.call(EN, s) }
})()
