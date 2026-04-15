import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const resources = {
  en: {
    translation: {
      home: "Home",
      dashboard: "Dashboard",
      history: "History",
      startAssessment: "Start Assessment",
      startFreeAssessment: "Start Free Assessment",
      childProfile: "बच्चे की जानकारी / Child Profile",
      symptoms: "Symptoms / लक्षण",
      dailyBudgetHelp: "Daily food budget in ₹",
      voiceUnavailable: "Voice input not available on this device.",
      uploadPhoto: "Upload a photo to enable visual growth assessment.",
      childHealthResponsibility: "Child health, our responsibility",
    },
  },
  hi: {
    translation: {
      home: "होम",
      dashboard: "डैशबोर्ड",
      history: "इतिहास",
      startAssessment: "आकलन शुरू करें",
      startFreeAssessment: "मुफ़्त आकलन शुरू करें",
      childProfile: "बच्चे की जानकारी",
      symptoms: "लक्षण",
      dailyBudgetHelp: "दैनिक भोजन बजट ₹ में",
      voiceUnavailable: "इस डिवाइस पर वॉइस इनपुट उपलब्ध नहीं है।",
      uploadPhoto: "दृश्य वृद्धि आकलन के लिए फोटो अपलोड करें।",
      childHealthResponsibility: "बच्चे की सेहत, हमारी ज़िम्मेदारी",
    },
  },
};

i18n.use(initReactI18next).init({
  resources,
  lng: "en",
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

export default i18n;
