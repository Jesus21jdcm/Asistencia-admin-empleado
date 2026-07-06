import React from 'react';
import { Outlet } from 'react-router-dom';

export const AuthLayout: React.FC = () => {
  return (
    <div className="min-h-screen relative flex flex-col justify-center py-12 sm:px-6 lg:px-8 overflow-hidden bg-[#0A4174]">
      {/* Background Image Overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat z-0"
        style={{ backgroundImage: 'url("/login_bg.png")', opacity: 0.6 }}
      ></div>
      
      {/* Gradient to darken the image slightly so the white login box pops */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0A4174]/60 to-[#001D39]/80 backdrop-blur-[2px] z-0"></div>

      <div className="relative z-10 w-full sm:mx-auto sm:max-w-md">
        <Outlet />
      </div>
    </div>
  );
};
