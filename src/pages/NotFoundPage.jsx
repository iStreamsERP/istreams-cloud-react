import { Button } from "@/components/ui/button";
import React from "react";
import { Link } from "react-router-dom";

const NotFoundPage = () => {
  return (
    <div className="flex min-h-screen items-center justify-center primary-content bg-slate-100 text-2xl transition-colors dark:bg-slate-950">
      <div className="bg-white bg-opacity-10 backdrop-blur-lg p-8 rounded-2xl shadow-lg max-w-lg w-full text-white text-center">
        <h1 className="text-7xl font-bold">404</h1>
        <p className="text-lg mt-2 text-gray-300">Oops! Page not found.</p>
        <p className="text-xs text-gray-400 mt-1">
          The page you are looking for doesn't exist or has been moved.
        </p>

        <Link
          to="/"

        >
          <Button className="mt-8">Go to Home</Button>
        </Link>
      </div>
    </div>
  );
};

export default NotFoundPage;
