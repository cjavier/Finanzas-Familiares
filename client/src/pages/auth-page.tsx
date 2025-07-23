import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Wallet, Eye, EyeOff } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserSchema } from "@shared/schema";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

const signupSchema = insertUserSchema.extend({
  teamOption: z.enum(["create", "join"]),
});

type LoginForm = z.infer<typeof loginSchema>;
type SignupForm = z.infer<typeof signupSchema>;

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [teamOption, setTeamOption] = useState<"create" | "join">("create");
  const { user, loginMutation, registerMutation } = useAuth();
  const [, navigate] = useLocation();

  // Redirect if already logged in
  if (user) {
    navigate("/");
    return null;
  }

  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const signupForm = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      teamOption: "create",
      teamName: "",
      inviteCode: "",
    },
  });

  const handleLogin = async (data: LoginForm) => {
    loginMutation.mutate(data);
  };

  const handleSignup = async (data: SignupForm) => {
    const { teamOption, ...userData } = data;
    registerMutation.mutate(userData);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-gray-50 px-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 max-w-6xl w-full gap-8 items-center">
        {/* Hero Section */}
        <div className="hidden lg:block space-y-6">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-12 h-12 bg-blue-600 rounded-xl">
              <Wallet className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-gray-800">FamilyBudget</h1>
          </div>
          <div className="space-y-4">
            <h2 className="text-3xl font-semibold text-gray-800">
              Manage your family finances together
            </h2>
            <p className="text-lg text-gray-600">
              Track expenses, set budgets, and collaborate with your family members to achieve your financial goals.
            </p>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-gray-600">Multi-user support for families</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-gray-600">Real-time expense tracking</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                <span className="text-gray-600">Budget insights and analytics</span>
              </div>
            </div>
          </div>
        </div>

        {/* Auth Form */}
        <div className="w-full max-w-md mx-auto lg:mx-0">
          {/* Mobile Logo */}
          <div className="text-center mb-8 lg:hidden">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-xl mb-4">
              <Wallet className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-800">FamilyBudget</h1>
            <p className="text-gray-600 mt-2">Manage your family finances together</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">
                {isLogin ? "Sign In" : "Create Account"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLogin ? (
                <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-5">
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      {...loginForm.register("email")}
                      className="mt-2"
                    />
                    {loginForm.formState.errors.email && (
                      <p className="text-sm text-red-500 mt-1">
                        {loginForm.formState.errors.email.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="password">Password</Label>
                    <div className="relative mt-2">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        {...loginForm.register("password")}
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-gray-400" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-400" />
                        )}
                      </Button>
                    </div>
                    {loginForm.formState.errors.password && (
                      <p className="text-sm text-red-500 mt-1">
                        {loginForm.formState.errors.password.message}
                      </p>
                    )}
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={loginMutation.isPending}
                  >
                    {loginMutation.isPending ? "Signing in..." : "Sign In"}
                  </Button>
                </form>
              ) : (
                <form onSubmit={signupForm.handleSubmit(handleSignup)} className="space-y-5">
                  <div>
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      type="text"
                      placeholder="Enter your full name"
                      {...signupForm.register("name")}
                      className="mt-2"
                    />
                    {signupForm.formState.errors.name && (
                      <p className="text-sm text-red-500 mt-1">
                        {signupForm.formState.errors.name.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="Enter your email"
                      {...signupForm.register("email")}
                      className="mt-2"
                    />
                    {signupForm.formState.errors.email && (
                      <p className="text-sm text-red-500 mt-1">
                        {signupForm.formState.errors.email.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="signup-password">Password</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="Create a password"
                      {...signupForm.register("password")}
                      className="mt-2"
                    />
                    {signupForm.formState.errors.password && (
                      <p className="text-sm text-red-500 mt-1">
                        {signupForm.formState.errors.password.message}
                      </p>
                    )}
                  </div>

                  <div className="border-t pt-5">
                    <h3 className="text-lg font-medium text-gray-800 mb-4">Team Setup</h3>
                    
                    <RadioGroup 
                      value={teamOption} 
                      onValueChange={(value: "create" | "join") => {
                        setTeamOption(value);
                        signupForm.setValue("teamOption", value);
                      }}
                      className="space-y-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="create" id="create" />
                        <Label htmlFor="create">Create new team</Label>
                      </div>
                      
                      {teamOption === "create" && (
                        <div>
                          <Input
                            type="text"
                            placeholder="Enter team name (e.g., Smith Family)"
                            {...signupForm.register("teamName")}
                          />
                          {signupForm.formState.errors.teamName && (
                            <p className="text-sm text-red-500 mt-1">
                              {signupForm.formState.errors.teamName.message}
                            </p>
                          )}
                        </div>
                      )}
                      
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="join" id="join" />
                        <Label htmlFor="join">Join existing team</Label>
                      </div>
                      
                      {teamOption === "join" && (
                        <div>
                          <Input
                            type="text"
                            placeholder="Enter invitation code"
                            {...signupForm.register("inviteCode")}
                          />
                          {signupForm.formState.errors.inviteCode && (
                            <p className="text-sm text-red-500 mt-1">
                              {signupForm.formState.errors.inviteCode.message}
                            </p>
                          )}
                        </div>
                      )}
                    </RadioGroup>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={registerMutation.isPending}
                  >
                    {registerMutation.isPending ? "Creating Account..." : "Create Account"}
                  </Button>
                </form>
              )}

              <div className="text-center mt-6">
                <span className="text-gray-600">
                  {isLogin ? "Don't have an account? " : "Already have an account? "}
                </span>
                <Button
                  variant="link"
                  className="p-0 font-medium"
                  onClick={() => setIsLogin(!isLogin)}
                >
                  {isLogin ? "Sign up" : "Sign in"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
