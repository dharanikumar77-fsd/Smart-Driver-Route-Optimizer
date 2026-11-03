class AICopilot {
  constructor() {
    this.suggestions = {
      en: ["Route from Chennai to Madurai by car", "Coimbatore to Ooty by bus at 40L fuel", "Show me the path to Salem"],
      ta: ["சென்னையில் இருந்து மதுரைக்கு கார்", "கோயம்புத்தூரிலிருந்து ஊட்டிக்கு பேருந்து", "மதுரையில் இருந்து திண்டுக்கல் 20லி"],
      hi: ["चेन्नई से मदुरै तक कार से", "कोयंबटूर से ऊटी बस से", "सेलम का रास्ता दिखाएं"],
      te: ["చెన్నై నుండి మదురై వరకు కారులో", "కోయంబత్తూర్ నుండి ఊటీ బస్సు", "సేలం కు మార్గం చూపించు"],
      kn: ["ಚೆನ್ನೈನಿಂದ ಮಧುರೈಗೆ ಕಾರಿನಲ್ಲಿ", "ಕೊಯಮತ್ತೂರಿನಿಂದ ಊಟಿಗೆ ಬಸ್", "ಸೇಲಂಗೆ ದಾರಿ ತೋರಿಸಿ"],
      ml: ["ചെന്നൈയിൽ നിന്ന് മധുരയിലേക്ക് കാറിൽ", "കോയമ്പത്തൂരിൽ നിന്ന് ഊട്ടി ബസ്", "സേലത്തേക്കുള്ള വഴി കാണിക്കുക"],
      bn: ["চেন্নাই থেকে মাদুরাই গাড়িতে", "কোয়েম্বাটোর থেকে উটি বাস", "সালেমের রাস্তা দেখান"],
      mr: ["चेन्नई ते मदुराई कारने", "कोइम्बतूर ते उटी बस", "सालेमचा रस्ता दाखवा"],
      gu: ["ચેન્નઈ થી મદુરાઈ કાર દ્વારા", "કોઈમ્બતુર થી ઉટી બસ", "સેલમ નો રસ્તો બતાવો"]
    };
  }

  getSuggestionsHTML() {
    const lang = typeof CURRENT_LANG !== "undefined" ? CURRENT_LANG : "en";
    const sugList = this.suggestions[lang] || this.suggestions["en"];
    let html = `<div class="mb-3"><p class="text-[11px] font-bold text-slate-500 mb-2 uppercase tracking-wide">💡 Try saying or typing:</p><div class="flex flex-wrap gap-2">`;
    sugList.forEach(s => {
      html += `<button onclick="document.getElementById('aiChatInput').value='${s}'; document.getElementById('aiSendBtn').click();" class="bg-white text-blue-600 border border-blue-200 px-3 py-1.5 rounded-full text-[11px] hover:bg-blue-50 transition shadow-sm font-medium">${s}</button>`;
    });
    html += `</div></div>`;
    return html;
  }

  async processUserQuery(userText) {
    const lowerText = userText.toLowerCase();
    let foundCities = [];

    // Extract Cities globally across languages
    for (const cityKey in TN_CITIES) {
      let cIndex = lowerText.indexOf(cityKey.toLowerCase());

      if (cIndex === -1 && typeof I18N !== 'undefined' && I18N.cities[cityKey]) {
        for (const l of ['ta', 'hi', 'te', 'kn', 'ml', 'bn', 'mr', 'gu']) {
          if (I18N.cities[cityKey][l]) {
            const idx = lowerText.indexOf(I18N.cities[cityKey][l].toLowerCase());
            if (idx !== -1) { cIndex = idx; break; }
          }
        }
      }

      if (cIndex !== -1) foundCities.push({ key: cityKey, index: cIndex });
    }

    foundCities.sort((a, b) => a.index - b.index);

    // Extract Vehicle (Multi-lingual keywords)
    let foundVehicle = null;
    const vehicleKeywords = {
      "car": ["car", "suv", "கார்", "कार", "కారు", "ಕಾರು", "കാർ", "গাড়ি", "કાર"],
      "bus": ["bus", "coach", "பேருந்து", "बस", "బస్సు", "ಬಸ್", "ബസ്", "বাস", "બસ"],
      "truck": ["truck", "நடுத்தர", "லாரி", "ट्रक", "ట్రక్", "ಟ್ರಕ್", "ട്രക്ക്", "ট্রাক", "ટ્રક"],
      "heavy_truck": ["heavy", "கனரக", "भारी", "భారీ", "ಭಾರಿ", "ഭാരവാഹനം", "ভারী", "अवजड", "ભારે"],
      "bike": ["bike", "two-wheeler", "motorcycle", "இருசக்கர", "दोपहिया", "బైక్", "ಬೈಕ್", "ബൈക്ക്", "বাইক", "दुचाकी", "બાઇક"]
    };

    for (const vKey in vehicleKeywords) {
      if (vehicleKeywords[vKey].some(kw => lowerText.includes(kw))) {
        foundVehicle = vKey;
        break;
      }
    }

    // Extract Fuel Value (Cross-Language Regex Matching)
    let fuelVal = null;
    const fuelRegex = /(\d+)\s*(l|lit|liter|litres|லி|लीटर|లీటర్|ಲೀಟರ್|ലിറ്റർ|লিটার|लिटर|લિટર|fuel|எரிபொருள்|ईंधन|ఇంధనం|ಇಂಧನ|ഇന്ധനം|জ্বালানী|इंधन|બળતણ)/i;
    const reverseFuelRegex = /(?:fuel|எரிபொருள்|ईंधन|ఇంధనం|ಇಂಧನ|ഇന്ധനം|জ্বালানী|इंधन|બળતણ)(?:\s+of)?\s+(\d+)/i;

    const fuelMatch = lowerText.match(fuelRegex) || lowerText.match(reverseFuelRegex);
    if (fuelMatch) fuelVal = parseFloat(fuelMatch[1]);

    // Action Execution
    const lang = typeof CURRENT_LANG !== "undefined" ? CURRENT_LANG : "en";

    if (foundCities.length >= 2) {
      const source = foundCities[0].key;
      const dest = foundCities[1].key;
      const vehicle = foundVehicle || document.getElementById("vehicleSelect")?.value || "car";

      if (fuelVal && document.getElementById("fuelInput")) {
        document.getElementById("fuelInput").value = fuelVal;
      }

      if (window.dispatchAutonomousRoute) {
        window.dispatchAutonomousRoute({ source, destination: dest, vehicle });

        const successMsg = {
          en: `<b>🧭 Route Dispatched:</b> Calculating optimal path from ${getCityName(source)} to ${getCityName(dest)} by ${getVehicleName(vehicle)}${fuelVal ? ` with ${fuelVal}L fuel` : ''}.`,
          ta: `<b>🧭 பாதை அமைக்கப்பட்டது:</b> ${getCityName(source)} முதல் ${getCityName(dest)} வரை ${getVehicleName(vehicle)} மூலம்${fuelVal ? ` (${fuelVal}L எரிபொருள்)` : ''}.`,
          hi: `<b>🧭 मार्ग निर्धारित:</b> ${getCityName(source)} से ${getCityName(dest)} तक ${getVehicleName(vehicle)} से${fuelVal ? ` (${fuelVal}L ईंधन)` : ''}.`,
          te: `<b>🧭 మార్గం నిర్దేశించబడింది:</b> ${getCityName(source)} నుండి ${getCityName(dest)} వరకు ${getVehicleName(vehicle)}${fuelVal ? ` (${fuelVal}L ఇంధనం)` : ''}.`,
          kn: `<b>🧭 ಮಾರ್ಗ ಸಿದ್ಧವಾಗಿದೆ:</b> ${getCityName(source)} ನಿಂದ ${getCityName(dest)} ವರೆಗೆ ${getVehicleName(vehicle)}${fuelVal ? ` (${fuelVal}L ಇಂಧನ)` : ''}.`,
          ml: `<b>🧭 റൂട്ട് സജ്ജീകരിച്ചു:</b> ${getCityName(source)} മുതൽ ${getCityName(dest)} വരെ ${getVehicleName(vehicle)}${fuelVal ? ` (${fuelVal}L ഇന്ധനം)` : ''}.`,
          bn: `<b>🧭 রুট তৈরি:</b> ${getCityName(source)} থেকে ${getCityName(dest)} পর্যন্ত ${getVehicleName(vehicle)}${fuelVal ? ` (${fuelVal}L জ্বালানী)` : ''}.`,
          mr: `<b>🧭 मार्ग सेट केला:</b> ${getCityName(source)} ते ${getCityName(dest)} पर्यंत ${getVehicleName(vehicle)}${fuelVal ? ` (${fuelVal}L इंधन)` : ''}.`,
          gu: `<b>🧭 રૂટ તૈયાર છે:</b> ${getCityName(source)} થી ${getCityName(dest)} સુધી ${getVehicleName(vehicle)}${fuelVal ? ` (${fuelVal}L બળતણ)` : ''}.`
        };
        return successMsg[lang] || successMsg["en"];
      }
    } else if (foundCities.length === 1) {
      const missingMsg = {
        en: `I detected ${getCityName(foundCities[0].key)}, but I need both a source and a destination to plan a route.`,
        ta: `நான் ${getCityName(foundCities[0].key)} ஐ கண்டறிந்தேன், ஆனால் புறப்படும் மற்றும் சேரும் இடங்கள் இரண்டும் தேவை.`,
        hi: `मुझे ${getCityName(foundCities[0].key)} मिला, लेकिन स्रोत और गंतव्य दोनों की आवश्यकता है।`,
        te: `నేను ${getCityName(foundCities[0].key)} ను గుర్తించాను, కానీ మూలం మరియు గమ్యం రెండూ అవసరం.`,
        kn: `ನಾನು ${getCityName(foundCities[0].key)} ಅನ್ನು ಪತ್ತೆ ಮಾಡಿದ್ದೇನೆ, ಆದರೆ ಮೂಲ ಮತ್ತು ಗಮ್ಯಸ್ಥಾನ ಎರಡೂ ಅಗತ್ಯವಿದೆ.`,
        ml: `ഞാൻ ${getCityName(foundCities[0].key)} കണ്ടെത്തി, എന്നാൽ ഒരു ഉറവിടവും ലക്ഷ്യസ്ഥാനവും ആവശ്യമാണ്.`,
        bn: `আমি ${getCityName(foundCities[0].key)} সনাক্ত করেছি, তবে উৎস এবং গন্তব্য উভয়ই প্রয়োজন।`,
        mr: `मला ${getCityName(foundCities[0].key)} सापडले, परंतु स्रोत आणि गंतव्यस्थान दोन्ही आवश्यक आहेत.`,
        gu: `મને ${getCityName(foundCities[0].key)} મળ્યું, પણ સ્ત્રોત અને ગંતવ્ય બંને ની જરૂર છે.`
      };
      return missingMsg[lang] || missingMsg["en"];
    }

    const fallbackMsg = {
      en: "I couldn't understand the locations. Try saying: 'Route from Chennai to Madurai by car'.",
      ta: "ஊர் பெயர்களை புரிந்து கொள்ள முடியவில்லை. 'சென்னையில் இருந்து மதுரைக்கு கார்' என்று கூறவும்.",
      hi: "मैं स्थानों को नहीं समझ सका। 'चेन्नई से मदुरै तक कार से' कहने का प्रयास करें।",
      te: "నేను స్థానాలను అర్థం చేసుకోలేకపోయాను. 'చెన్నై నుండి మదురై వరకు కారు' అని ప్రయత్నించండి.",
      kn: "ಸ್ಥಳಗಳನ್ನು ಅರ್ಥಮಾಡಿಕೊಳ್ಳಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ. 'ಚೆನ್ನೈನಿಂದ ಮಧುರೈಗೆ ಕಾರು' ಎಂದು ಹೇಳಿ.",
      ml: "സ്ഥലങ്ങൾ മനസ്സിലാക്കാൻ കഴിഞ്ഞില്ല. 'ചെന്നൈയിൽ നിന്ന് മധുരയിലേക്ക് കാറിൽ' എന്ന് പറയുക.",
      bn: "আমি অবস্থানগুলি বুঝতে পারিনি। 'চেন্নাই থেকে মাদুরাই গাড়িতে' বলার চেষ্টা করুন।",
      mr: "मला ठिकाणे समजली नाहीत. 'चेन्नई ते मदुराई कार' असे सांगण्याचा प्रयत्न करा.",
      gu: "હું સ્થાનો સમજી શક્યો નથી. 'ચેન્નઈ થી મદુરાઈ કાર' કહેવાનો પ્રયાસ કરો."
    };
    return fallbackMsg[lang] || fallbackMsg["en"];
  }

  generateRouteBriefing(result) {
    const briefing = {
      en: `<b>🛡️ Safety Protocol:</b> ${result.totalDistance}km journey authorized for ${result.vehicle.name}.`,
      ta: `<b>🛡️ பாதுகாப்பு விதிமுறைகள்:</b> ${result.vehicle.name} மூலம் ${result.totalDistance} கி.மீ பயணத்திற்கு அனுமதி.`,
      hi: `<b>🛡️ सुरक्षा प्रोटोकॉल:</b> ${result.vehicle.name} के लिए ${result.totalDistance} किमी यात्रा अधिकृत।`,
      te: `<b>🛡️ భద్రతా ప్రోటోకాల్:</b> ${result.vehicle.name} కోసం ${result.totalDistance} కి.మీ ప్రయాణం అధికారం చేయబడింది.`,
      kn: `<b>🛡️ ಸುರಕ್ಷತಾ ಶಿಷ್ಟಾಚಾರ:</b> ${result.vehicle.name} ಗಾಗಿ ${result.totalDistance} ಕಿಮೀ ಪ್ರಯಾಣ ಅನುಮೋದಿಸಲಾಗಿದೆ.`,
      ml: `<b>🛡️ സുരക്ഷാ പ്രോട്ടോക്കോൾ:</b> ${result.vehicle.name} ന് ${result.totalDistance} കി.മീ യാത്ര അനുവദിച്ചു.`,
      bn: `<b>🛡️ নিরাপত্তা প্রোটোকল:</b> ${result.vehicle.name} এর জন্য ${result.totalDistance} কিমি ভ্রমণের অনুমতি দেওয়া হয়েছে।`,
      mr: `<b>🛡️ सुरक्षा प्रोटोकॉल:</b> ${result.vehicle.name} साठी ${result.totalDistance} किमी प्रवास अधिकृत.`,
      gu: `<b>🛡️ સુરક્ષા પ્રોટોકોલ:</b> ${result.vehicle.name} માટે ${result.totalDistance} કિમી મુસાફરી અધિકૃત છે.`
    };
    const lang = typeof CURRENT_LANG !== "undefined" ? CURRENT_LANG : "en";

    return `
      ${this.getSuggestionsHTML()}
      <div class="bg-indigo-50 border border-indigo-200 p-3 rounded-lg text-xs text-indigo-900 shadow-sm">
        ${briefing[lang] || briefing["en"]}
      </div>
    `;
  }
}

window.startVoiceRecognition = function () {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) { alert("Voice recognition not supported in this browser."); return; }

  const recognition = new SpeechRecognition();
  recognition.lang = typeof CURRENT_LANG !== 'undefined' ? CURRENT_LANG : 'en-US';
  recognition.interimResults = false;

  const chatInput = document.getElementById("aiChatInput");
  const micBtn = document.getElementById("micBtn");

  chatInput.placeholder = "Listening... Speak now 🎙️";
  micBtn.classList.add("mic-active", "bg-rose-100", "text-rose-600");

  recognition.onresult = (event) => {
    chatInput.value = event.results[0][0].transcript;
    chatInput.placeholder = "Type or tap mic...";
    micBtn.classList.remove("mic-active", "bg-rose-100", "text-rose-600");
    document.getElementById("aiSendBtn")?.click();
  };

  recognition.onerror = recognition.onend = () => {
    chatInput.placeholder = "Type or tap mic...";
    micBtn.classList.remove("mic-active", "bg-rose-100", "text-rose-600");
  };

  recognition.start();
};