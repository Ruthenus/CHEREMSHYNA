import Header from './components/Header';
import Hero from './components/Hero';
import Products from './components/Products';
import Ticker from './components/Ticker';
import About from './components/About';
import Principles from './components/Principles.jsx';
import Contacts from './components/Contacts.jsx';
import Footer from './components/Footer.jsx';
import './App.css';


function App() {
  return (
      <div className="app">
        <Header />
        <Hero />
        <Products />
        <Ticker />
          <About />
          <Principles />
          <Contacts />
          <Footer />

      </div>
  );
}

export default App;