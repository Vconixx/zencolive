export default function Home() {
  return (
    <main className="min-h-screen bg-[#313338] text-white flex">
      <aside className="w-20 bg-[#1e1f22] flex flex-col items-center py-4 gap-4">
        <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center font-bold text-xl">
          Z
        </div>
        {["🎮", "🎧", "💬", "⚙️"].map((icon) => (
          <div
            key={icon}
            className="w-12 h-12 rounded-full bg-[#313338] hover:rounded-2xl hover:bg-indigo-600 transition-all flex items-center justify-center text-xl cursor-pointer"
          >
            {icon}
          </div>
        ))}
      </aside>

      <aside className="w-64 bg-[#2b2d31] p-4 flex flex-col">
        <h1 className="text-xl font-bold border-b border-[#1e1f22] pb-4">
          ZencoLive
        </h1>

        <div className="mt-4">
          <p className="text-xs text-gray-400 font-bold mb-2">METİN KANALLARI</p>
          {["genel-sohbet", "duyurular", "yardım", "oyun"].map((channel) => (
            <div
              key={channel}
              className="px-3 py-2 rounded hover:bg-[#404249] text-gray-300 cursor-pointer"
            >
              # {channel}
            </div>
          ))}
        </div>

        <div className="mt-6">
          <p className="text-xs text-gray-400 font-bold mb-2">SES KANALLARI</p>
          {["Genel Ses", "Oyun Odası", "Yayın Odası"].map((voice) => (
            <div
              key={voice}
              className="px-3 py-2 rounded hover:bg-[#404249] text-gray-300 cursor-pointer"
            >
              🔊 {voice}
            </div>
          ))}
        </div>

        <div className="mt-auto bg-[#232428] p-3 rounded flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-green-500"></div>
          <div>
            <p className="font-bold text-sm">Vconixx</p>
            <p className="text-xs text-gray-400">Çevrimiçi</p>
          </div>
        </div>
      </aside>

      <section className="flex-1 flex flex-col">
        <header className="h-14 bg-[#313338] border-b border-[#1e1f22] flex items-center px-6">
          <h2 className="font-bold"># genel-sohbet</h2>
        </header>

        <div className="flex-1 p-6 space-y-5 overflow-y-auto">
          {[
            ["ZencoBot", "ZencoLive sunucusuna hoş geldin! 🚀"],
            ["Vconixx", "Discord tarzı arayüz başarıyla çalışıyor."],
            ["Mert", "Sesli oda ve ekran paylaşımı da gelecek mi?"],
            ["ZencoBot", "Evet, sıradaki aşamada gerçek zamanlı sistem kurulacak."],
          ].map(([name, message]) => (
            <div key={message} className="flex gap-4">
              <div className="w-11 h-11 rounded-full bg-indigo-600 flex items-center justify-center font-bold">
                {name[0]}
              </div>
              <div>
                <p className="font-bold">
                  {name} <span className="text-xs text-gray-400">bugün</span>
                </p>
                <p className="text-gray-300">{message}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="p-5">
          <div className="bg-[#383a40] rounded-xl px-4 py-3 text-gray-400">
            #genel-sohbet kanalına mesaj gönder...
          </div>
        </div>
      </section>

      <aside className="w-60 bg-[#2b2d31] p-4 hidden lg:block">
        <p className="text-xs text-gray-400 font-bold mb-3">ÇEVRİMİÇİ</p>
        {["Vconixx", "ZencoBot", "Mert", "Ayşe"].map((user) => (
          <div key={user} className="flex items-center gap-3 py-2 text-gray-300">
            <div className="w-9 h-9 rounded-full bg-green-500"></div>
            {user}
          </div>
        ))}
      </aside>
    </main>
  );
}