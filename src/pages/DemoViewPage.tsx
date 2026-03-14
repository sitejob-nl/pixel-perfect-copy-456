import { Navigate, useParams } from "react-router-dom";

// Redirects to the new PublicDemoPage
export default function DemoViewPage() {
  const { slug } = useParams<{ slug: string }>();
  return <Navigate to={`/demo/${slug}`} replace />;
}
