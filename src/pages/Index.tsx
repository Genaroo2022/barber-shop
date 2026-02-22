import Hero from "@/components/landing/Hero";
import AiComingSoon from "@/components/landing/AiComingSoon";
import Services from "@/components/landing/Services";
import Gallery from "@/components/landing/Gallery";
import BookingForm from "@/components/landing/BookingForm";
import { Navbar, Footer } from "@/components/landing/Layout";

const Index = () => {
  return (
    <div id="top" className="min-h-screen bg-background">
      <Navbar />
      <Hero />
      <AiComingSoon />
      <Services />
      <Gallery />
      <BookingForm />
      <Footer />
    </div>
  );
};

export default Index;
