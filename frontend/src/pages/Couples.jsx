function Couples() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Background */}
      <div
        className="absolute inset-0 bg-cover bg-center z-0"
        style={{
          backgroundImage: `url("/images/couples.jpg")`,
          filter: "brightness(0.3)",
        }}
      />
      <div className="absolute inset-0 z-[1] bg-gradient-to-b from-loverai-deep/50 via-transparent to-loverai-deep/80"></div>
      <div className="absolute top-1/3 left-1/3 w-[400px] h-[400px] bg-loverai-gold/[0.03] rounded-full blur-[150px] z-[1]"></div>

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 py-20">
        {/* Logo */}
        <img src="/images/LogoLoversai.png" alt="LoversAI" className="h-16 w-auto mb-8 animate-float" />
        
        <div className="text-center animate-fadeInUp">
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-heading loverai-gradient-text mb-6 tracking-wide">
            Couples
          </h1>
          
          <div className="glass-card-strong rounded-2xl px-8 py-4 inline-block mb-8 animate-pulseGlow">
            <span className="text-loverai-gold font-semibold text-lg">✨ Coming Soon</span>
          </div>

          <p className="text-lg md:text-xl text-white/50 max-w-lg mx-auto leading-relaxed mb-10">
            Amazing AI-powered features for couples are on the way — 
            plan your dream wedding with intelligent tools.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
            {[
              { icon: "🎨", title: "AI Moodboards", desc: "Visualize your wedding theme" },
              { icon: "📋", title: "Smart Planning", desc: "AI-powered checklists" },
              { icon: "💡", title: "Vendor Matching", desc: "Find your perfect vendors" },
            ].map((feature, i) => (
              <div key={i} className={`glass-card rounded-xl p-5 text-center hover-lift animate-fadeInUp stagger-${i + 1}`}>
                <div className="text-3xl mb-3">{feature.icon}</div>
                <h3 className="text-white font-semibold text-sm mb-1">{feature.title}</h3>
                <p className="text-white/40 text-xs">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
export default Couples;
