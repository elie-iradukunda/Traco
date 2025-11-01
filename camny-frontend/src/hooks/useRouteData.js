import { useState, useEffect } from "react";
import { getRoutes } from "../services/api";

export const useRouteData = () => {
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getRoutes().then(res => {
      setRoutes(res.data);
      setLoading(false);
    });
  }, []);

  return { routes, loading };
};
