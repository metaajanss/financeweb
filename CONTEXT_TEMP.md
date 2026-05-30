# Proje Bağlamı (Project Context)

Bu dosya, projede bugüne kadar yapılan işlemleri ve bundan sonraki geliştirmeler için uyulması gereken temel kuralları içerir. 

## Bugüne Kadar Yapılan İşlemler
- **Otomatik Blog Sistemi**: Otomatik blog sistemi kopyalandı ve projeye entegre edildi.
- **Hata Çözümleri**: Modül içe aktarma (Module Import) derleme hataları düzeltildi.
- **Vercel Entegrasyonu**: Vercel Cron Deployment uyumluluğu kontrol edildi ve ayarlandı (Hobby plan limitleri dahilinde).
- **GitHub**: Proje yerel Git deposu olarak başlatıldı ve GitHub'a yüklendi.
- **Super Admin**: Super Admin içerik kopyalama işlevleri doğrulandı.
- **SEO & Analiz**: `debt-payoff-calculator.html` dosyası analiz edildi ve projenin SEO yapısı incelenip değerlendirildi.

## Temel Kurallar (Core Rules)
1. **Bağlam Kontrolü:** Herhangi bir kod yazmadan, dosya değiştirmeden veya yeni bir araç çalıştırmadan önce **MUTLAKA** bu `CONTEXT.md` dosyası (veya güncel proje bağlamı) kontrol edilecek.
2. **Durum Güncellemesi:** Önemli bir özellik eklendiğinde, mimari bir değişiklik yapıldığında veya kritik bir hata çözüldüğünde bu dosya güncellenecektir.
3. **SEO & Performans:** Web uygulaması için her zaman SEO ve performans en iyi pratikleri (best practices) uygulanacak.
4. **Tasarım:** Arayüz modern, estetik ve premium bir hisse sahip olmalıdır. TailwindCSS kullanımı istenmedikçe Vanilla CSS ile zengin tasarımlar yapılacaktır (Next.js projesi olduğu için mevcut Tailwind altyapısı kullanılabilir).

---
*Not: Bu bağlam dosyası projenin kök dizininde saklanır ve asistanın her yeni istekte projenin mevcut durumunu anlamasına yardımcı olur.*
- **Ana Sayfa Entegrasyonu**: K�k dizindeki \debt-payoff-calculator.html\ dosyas� Next.js mimarisine uygun �ekilde React bile�enine �evrilerek projenin ana sayfas� (\src/app/[locale]/page.tsx\) olarak entegre edildi. CSS kodlar� \calculator.css\ adl� dosyaya ayr�ld�.
- **Reklam Alanlar� Entegrasyonu**: Ana sayfadaki 3 adet reklam alan� (Top, Mid, Bottom) Super Admin Reklam Y�netimi sayfas�na ba�land�. Art�k kullan�c�lar her bir alana �zel \<ins>\ reklam kodunu Super Admin panelinden girebiliyor.
