import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { NavBar } from "@/components/NavBar";
import { Hexagon } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background">
      <NavBar />
      <div className="flex min-h-[80vh] flex-col items-center justify-center px-4 pt-14">
        <Hexagon className="h-16 w-16 text-muted-foreground/30 mb-6" />
        <h1 className="text-6xl font-display font-bold text-foreground mb-2">404</h1>
        <p className="text-xl text-muted-foreground mb-8">Page not found</p>
        <Button variant="default" onClick={() => navigate('/')}>
          Return to Home
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
