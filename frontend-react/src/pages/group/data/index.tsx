import { useEffect } from "react";
import { useNavigate } from "react-router";

export default function GroupDataIndexPage() {
  const navigate = useNavigate();
  useEffect(() => {
    // Force redirect to first valid page
    void navigate("/group/data/foods");
  }, [navigate]);
  return <div />;
}
