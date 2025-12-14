import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Building2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "./ui/alert";
import { loginUser } from "../lib/api-client";

interface LoginProps {
  onLogin: (role: 'admin' | 'pembimbing' | 'mahasiswa', user: any) => void;
}

export function Login({ onLogin }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // Real database login
      const user = await loginUser(email, password);
      onLogin(user.role.toLowerCase() as any, user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary to-accent p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="bg-primary text-primary-foreground p-4 rounded-lg">
              <Building2 className="w-12 h-12" />
            </div>
          </div>
          <div>
            <CardTitle>PT Pupuk Iskandar Muda</CardTitle>
            <CardDescription className="mt-2">
              Sistem Absensi Mahasiswa Magang
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email">Email / Nomor Badge</Label>
              <Input
                id="email"
                type="text"
                placeholder="Masukkan email atau nomor badge"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Masukkan password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Memproses...' : 'Login'}
            </Button>
            
            <div className="pt-4 space-y-2">
              <p className="text-sm text-center text-muted-foreground">Contoh Akun:</p>
              <div className="text-xs text-center text-muted-foreground space-y-1">
                <p>Admin: ADM001 atau admin@pim.co.id</p>
                <p>Pembimbing: PB001 atau budiman@pim.co.id</p>
                <p>Mahasiswa: 2021001 atau ahmad.fauzi@email.com</p>
                <p>Password: password123</p>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
