import React from "react";

const Layout = ({ children }) => {
  return (
    <div className="p-4 max-w-6xl mx-auto">
      {children}
    </div>
  );
};

export default Layout;
