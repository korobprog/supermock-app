import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import { I18nProvider } from './components/I18nProvider';

// Import pages
import Home from './pages/index';
import About from './pages/About';
import Pricing from './pages/Pricing';
import Languages from './pages/Languages';
import Features from './pages/Features';
import Professions from './pages/Professions';
import LearningProcess from './pages/LearningProcess';
import Instructions from './pages/Instructions';
import Support from './pages/Support';
import FAQ from './pages/FAQ';
import Documentation from './pages/Documentation';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import NotFound from './pages/NotFound';

function App() {
  return (
    <I18nProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="about" element={<About />} />
            <Route path="pricing" element={<Pricing />} />
            <Route path="languages" element={<Languages />} />
            <Route path="features" element={<Features />} />
            <Route path="professions" element={<Professions />} />
            <Route path="learning-process" element={<LearningProcess />} />
            <Route path="instructions" element={<Instructions />} />
            <Route path="support" element={<Support />} />
            <Route path="faq" element={<FAQ />} />
            <Route path="documentation" element={<Documentation />} />
            <Route path="privacy-policy" element={<PrivacyPolicy />} />
            <Route path="terms-of-service" element={<TermsOfService />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </Router>
    </I18nProvider>
  );
}

export default App;
