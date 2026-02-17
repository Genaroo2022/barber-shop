import Hero from "@/components/landing/Hero";
import Services from "@/components/landing/Services";
import Gallery from "@/components/landing/Gallery";
import BookingForm from "@/components/landing/BookingForm";
import { Navbar, Footer } from "@/components/landing/Layout";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <Hero />
      <Services />
      <Gallery />
      <BookingForm />
      <Footer />
    </div>
  );
};

export default Index;
