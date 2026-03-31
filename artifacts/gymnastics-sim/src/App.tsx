import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SimulationProvider } from "./context/SimulationContext";

// Layout
import { Header } from "./components/layout/Header";
import { Stepper } from "./components/layout/Stepper";

// Pages
import Home from "./pages/Home";
import Phase1_Teams from "./pages/Phase1_Teams";
import Phase2_TeamRoster from "./pages/Phase2_TeamRoster";
import Phase3_MixedGroups from "./pages/Phase3_MixedGroups";
import Phase4_RotationOrder from "./pages/Phase4_RotationOrder";
import Phase5_Scoring from "./pages/Phase5_Scoring";
import Phase6_Results from "./pages/Phase6_Results";
import Phase7_TeamFinal from "./pages/Phase7_TeamFinal";
import NotFound from "./pages/not-found";

const queryClient = new QueryClient();

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col relative selection:bg-amber-500/30 selection:text-white">
      <div className="fixed inset-0 pointer-events-none -z-20 bg-background" />
      <img 
        src={`${import.meta.env.BASE_URL}images/hero-bg.png`} 
        alt="Background" 
        className="fixed inset-0 w-full h-full object-cover opacity-20 pointer-events-none -z-10 mix-blend-screen"
      />
      <img 
        src={`${import.meta.env.BASE_URL}images/gold-particles.png`} 
        alt="Particles" 
        className="fixed inset-0 w-full h-full object-cover opacity-30 pointer-events-none -z-10 mix-blend-screen"
      />
      
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <Switch>
          <Route path="/" component={() => null} />
          <Route component={Stepper} />
        </Switch>
        <div className="mt-4">
          {children}
        </div>
      </main>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/teams" component={Phase1_Teams} />
      <Route path="/roster" component={Phase2_TeamRoster} />
      <Route path="/mixed-groups" component={Phase3_MixedGroups} />
      <Route path="/rotation" component={Phase4_RotationOrder} />
      <Route path="/scoring" component={Phase5_Scoring} />
      <Route path="/results" component={Phase6_Results} />
      <Route path="/team-final" component={Phase7_TeamFinal} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SimulationProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Layout>
            <Router />
          </Layout>
        </WouterRouter>
      </SimulationProvider>
    </QueryClientProvider>
  );
}

export default App;
