import Header from './components/Header';
import Hero from './components/Hero';
import Products from './components/Products';
import Ticker from './components/Ticker';
import About from './components/About';
import Principles from './components/Principles.jsx';
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

      </div>
  );
}

export default App;