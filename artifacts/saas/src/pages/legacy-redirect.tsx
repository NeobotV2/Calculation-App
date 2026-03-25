import { useEffect } from "react";
import { useRoute, useLocation } from "wouter";

export function KalkulationListRedirect() {
  const [, navigate] = useLocation();
  useEffect(() => {
    navigate("/kalkulation/neu", { replace: true });
  }, [navigate]);
  return null;
}

export function KalkulationDetailRedirect() {
  const [, params] = useRoute("/kalkulation/:id");
  const [, navigate] = useLocation();
  useEffect(() => {
    navigate(`/objekte/${params?.id || ""}`, { replace: true });
  }, [params?.id, navigate]);
  return null;
}

export function StundensatzRedirect() {
  const [, navigate] = useLocation();
  useEffect(() => {
    navigate("/kalkulation/neu", { replace: true });
  }, [navigate]);
  return null;
}
