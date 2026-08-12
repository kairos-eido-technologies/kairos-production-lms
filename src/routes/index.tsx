import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useAuth } from "@/lib/store";
import { useData } from "@/lib/data-store";
import "@/lib/data-load-init";

import { ParticleLayer } from "@/components/effects/ParticleLayer";
import { CustomCursor } from "@/components/effects/CustomCursor";
import { ScrollProgress } from "@/components/effects/ScrollProgress";
import { Nav } from "@/components/site/Nav";
import { Hero } from "@/components/site/Hero";
import { StatsStrip } from "@/components/site/StatsStrip";
import { CompanyMarquee } from "@/components/site/CompanyMarquee";
import { CourseGrid } from "@/components/site/CourseGrid";
import { PearsonBanner } from "@/components/site/PearsonBanner";
import { WhyItech } from "@/components/site/WhyItech";
import { FinalCta } from "@/components/site/FinalCta";
import { Footer } from "@/components/site/Footer";
import { VerifyModal } from "@/components/site/VerifyModal";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "iTech Academy Tirunelveli | Tech Training & Certifications" },
      {
        name: "description",
        content:
          "iTech Academy — Tirunelveli's #1 tech training institute. 30+ courses, Pearson VUE authorized test centre, ISO 9001:2015 certified, 100% placement assistance.",
      },
      { property: "og:title", content: "iTech Academy Tirunelveli | Tech Training & Certifications" },
      {
        property: "og:description",
        content:
          "Professional tech courses, global certifications and placement support in Tirunelveli. Authorized Pearson VUE test centre.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  const { user } = useAuth();
  const { courses } = useData();
  const [verifyOpen, setVerifyOpen] = useState(false);

  const displayCourses = useMemo(() => {
    if (!courses || courses.length === 0) return [];
    const previewList = courses.filter((c) => c && c.showInPreview && c.status === "active");
    if (previewList.length > 0) return previewList;
    return courses.filter((c) => c && c.status === "active");
  }, [courses]);

  return (
    // Exactly like the GitHub repo: ParticleLayer is at the root div level — covers the full page
    <div id="top" className="relative min-h-screen overflow-x-hidden bg-background text-foreground">
      <ParticleLayer />
      <CustomCursor />
      <ScrollProgress />
      <Nav user={user} onVerify={() => setVerifyOpen(true)} />
      <main className="relative">
        <Hero onVerify={() => setVerifyOpen(true)} />
        <StatsStrip />
        <CompanyMarquee />
        <CourseGrid courses={displayCourses} />
        <PearsonBanner />
        <WhyItech />
        <FinalCta />
      </main>
      <Footer />
      <VerifyModal open={verifyOpen} onClose={() => setVerifyOpen(false)} />
    </div>
  );
}
