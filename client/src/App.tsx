import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { ChakraProvider } from "@chakra-ui/react";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "./lib/protected-route";

// Pages
import LandingPage from "@/pages/landing-page";
import LoginPage from "@/pages/login-page";
import RegisterPage from "@/pages/register-page";
import OnboardingPage from "@/pages/onboarding-page";
import DashboardPage from "@/pages/dashboard-page";
import TransactionsPage from "@/pages/transactions-page";
import AddTransactionPage from "@/pages/add-transaction-page";
import CategoriesPage from "@/pages/categories-page";
import BudgetsPage from "@/pages/budgets-page";
import QuickBudgetPage from "@/pages/quick-budget-page";
import RulesPage from "@/pages/rules-page";
import FilesPage from "@/pages/files-page";
import NotificationsPage from "@/pages/notifications-page";
import TeamPage from "@/pages/team-page";
import ProfilePage from "@/pages/profile-page";
import AgentePage from "@/pages/agente-page";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/login" component={LoginPage} />
      <Route path="/register" component={RegisterPage} />
      <ProtectedRoute path="/onboarding" component={OnboardingPage} />
      <ProtectedRoute path="/dashboard" component={DashboardPage} />
      <ProtectedRoute path="/transactions" component={TransactionsPage} />
      <ProtectedRoute path="/transactions/add" component={AddTransactionPage} />
      <ProtectedRoute path="/categories" component={CategoriesPage} />
      <ProtectedRoute path="/budgets" component={BudgetsPage} />
      <ProtectedRoute path="/quick-budget" component={QuickBudgetPage} />
      <ProtectedRoute path="/rules" component={RulesPage} />
      <ProtectedRoute path="/files" component={FilesPage} />
      <ProtectedRoute path="/notifications" component={NotificationsPage} />
      <ProtectedRoute path="/team" component={TeamPage} />
      <ProtectedRoute path="/profile" component={ProfilePage} />
      <ProtectedRoute path="/agente" component={AgentePage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ChakraProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Router />
        </AuthProvider>
      </QueryClientProvider>
    </ChakraProvider>
  );
}

export default App;
