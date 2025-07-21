import React, { useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { assets } from "../assets/assets";
import { Menu, X } from "lucide-react";
import Sidebar from "../components/Sidebar";
import { SignIn, useUser } from "@clerk/clerk-react";

const Layout = () => {
  const navigate = useNavigate();
  const [sidebar, setSidebar] = useState(false);
  const { user } = useUser();

  return user ? (
    <div className="flex flex-col items-start justify-start h-screen">
      <nav className="w-full px-8 min-h-14 flex items-center justify-between border-b border-gray-200 bg-white relative z-50">
        <img
          className="cursor-pointer w-32 sm:w-44"
          src={assets.logo}
          alt=""
          onClick={() => navigate("/")}
        />
        {sidebar ? (
          <X
            onClick={() => setSidebar(false)}
            className="size-6 text-gray-600 sm:hidden"
          />
        ) : (
          <Menu
            onClick={() => setSidebar(true)}
            className="size-6 text-gray-600 sm:hidden"
          />
        )}
      </nav>
      <div className="flex-1 w-full flex h-[calc(100vh-64px)] relative">
        <Sidebar sidebar={sidebar} setSidebar={setSidebar} />
        <div
          className={`flex-1 bg-[#f4f7fb] transition-all duration-300 ${
            sidebar ? "max-sm:blur-sm max-sm:brightness-75" : ""
          }`}
        >
          <Outlet />
        </div>
        {/* Mobile backdrop for closing sidebar */}
        {sidebar && (
          <div
            className="fixed inset-0 z-30 sm:hidden"
            onClick={() => setSidebar(false)}
          />
        )}
      </div>
    </div>
  ) : (
    <div className="flex items-center justify-center h-screen">
      <SignIn />
    </div>
  );
};

export default Layout;
