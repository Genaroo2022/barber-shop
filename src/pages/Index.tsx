import Hero from "@/components/landing/Hero";
import Services from "@/components/landing/Services";
import Gallery from "@/components/landing/Gallery";
import BookingForm from "@/components/landing/BookingForm";

const Index = () => {
  return (
    <div id="top" className="min-h-screen bg-background">
      <Hero />
      <Services />
      <Gallery />
      <BookingForm />
    </div>
  );
};

export default Index;
