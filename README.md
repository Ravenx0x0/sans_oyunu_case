YAZILIM GELİŞTİRME UZMANI ADAYI – CASE STUDY
React + Django Tabanlı İki Oyunculu Şans Oyunu Platformu

1. Projenin Amacı
Bu çalışma, iki oyunculu odalar üzerinden çalışan gerçek zamanlı bir şans oyunu platformunun uçtan uca geliştirilmesini kapsamaktadır.
Case study kapsamında aşağıdaki yetkinlikler değerlendirilmektedir:
React ile kullanıcı arayüzü geliştirme
Django ve Django REST Framework ile API ve iş mantığı tasarımı
Django Channels kullanarak WebSocket tabanlı gerçek zamanlı iletişim kurgulama
Authentication, authorization, state ve sanal bakiye yönetimi
Frontend–backend ayrımının doğru kurgulanması
Kod okunabilirliği ve mimari kararlar

2. Kullanılan Teknolojiler
Frontend
React
Vite
Token tabanlı authentication
Backend
Python
Django
Django REST Framework
Django Channels
Daphne (ASGI server)
Gerçek Zamanlı İletişim
WebSocket (Django Channels)
Veritabanı
SQLite (kolay kurulum ve demo amaçlı)

3. Genel Uygulama Tanımı
Sistem, iki oyunculu odalar (rooms) üzerinden oynanan basit bir sayı tahmin oyunudur.
Aynı anda birden fazla oda aktif olabilir
Her oda maksimum 2 kullanıcı alır
Her oda tek bir bahis tutarı ile açılır
Oyun başladıktan sonra bahis tutarı değiştirilemez
Oyun birimi gerçek para değildir (sanal bakiye / puan)

4. Kullanıcı Yönetimi (Auth & Bakiye)
Backend Özellikleri
Kullanıcı kayıt (Signup)
Kullanıcı giriş (Login)
Token tabanlı kimlik doğrulama
Yaş kontrolü (18 yaş ve üzeri)
Kullanıcı rolleri: user, admin
Yeni kayıt olan her kullanıcıya 1000 birim başlangıç bakiyesi atanır
E-posta doğrulama, case kapsamında mock kabul edilmiştir. Email alanı alınmakta ancak gerçek doğrulama süreci kurgulanmamıştır.
Frontend Özellikleri
Üye olma ekranı
Giriş ekranı
Kullanıcının bakiye bilgisinin görüntülenmesi

5. Oda (Room) Sistemi
Oda Kuralları
Bir oda maksimum 2 kullanıcı alır
Oda oluşturulurken bahis tutarı belirlenir
Oda durumları:
Open: 1 kullanıcı var, bekliyor
Full: 2 kullanıcı var, oyun başlar
Finished: Oyun tamamlandı
Backend
Açık odaların listelenmesi
Kullanıcının:
Açık bir odaya katılabilmesi
Belirlediği bahis tutarı ile yeni oda açabilmesi
Kullanıcı bakiyesi bahis tutarına yetmiyorsa oda oluşturulamaz
Frontend
Açık odaların listelendiği lobby ekranı
Oda bilgileri:
Bahis tutarı
Mevcut oyuncu sayısı
“Odaya katıl” ve “Yeni oda aç” aksiyonları

6. Bahis (Bet) Kuralları
Bahis Ayarları
Minimum bahis
Maksimum bahis
Bahis artış kademesi
Bu ayarlar backend tarafında BetSettings modeli ile tutulur ve Django admin paneli üzerinden değiştirilebilir.
Bahis Akışı
Bahis tutarı oda oluşturulurken belirlenir
Oyun başladıktan sonra bahis değiştirilemez
Oyun başlarken:
Her iki oyuncunun bakiyesinden bahis tutarı kilitlenir
Bu işlem transaction olarak kaydedilir

7. Oyun Kuralları (Core Feature)
Oyun iki kullanıcı arasında oynanır
Sistem oyun başında:
1–100 arasında rastgele bir sayı belirler
Başlayacak kullanıcıyı yazı–tura ile seçer
Oyuncular sırayla tahmin yapar
Sistem:
“Daha yukarı” veya “Daha aşağı” geri bildirimi verir
Doğru tahmin yapılana kadar oyun devam eder
Oyun Sonu Bilgileri
Kazanan kullanıcı
Kaybeden kullanıcı
Toplam tur sayısı
Oyun süresi (başlangıç / bitiş zamanı)
Bahis tutarı

8. Gerçek Zamanlı Oyun (WebSocket)
Backend
Oyun akışı WebSocket üzerinden yönetilir
Anlık iletilen bilgiler:
Yapılan tahminler
Sıranın kimde olduğu
Oyun durumu
Oyun sonucu
Frontend
Canlı oyun ekranı
Sıra bilgisi
Tahmin geçmişi (event log)
Oyun sonucu ekranı
WebSocket event’leri snapshot ve game event yapısı ile tasarlanmıştır.

9. Bakiye ve Hesap Hareketleri
Oyun başında her iki oyuncunun bakiyesinden bahis tutarı düşülür (BET_LOCK)
Oyun sonunda:
Kazanan kullanıcının bakiyesine 2x bahis eklenir (PAYOUT)
Tüm işlemler AccountTransaction tablosunda saklanır
Kullanıcılar kendi hesap hareketlerini listeleyebilir

10. Kullanıcı Tarafı Ekranlar
Giriş
Üyelik
Oda listesi (Lobby)
Oda oluşturma
Oyun ekranı
Leaderboard
Hesap hareketleri
Profil ve bakiye görüntüleme

11. Backoffice (Admin Panel)
Backend
Admin yetkisine sahip kullanıcılar için Django Admin Panel üzerinden:
Kullanıcı yönetimi (CRUD)
Kullanıcı arama ve filtreleme
Hesap hareketleri görüntüleme
Açık / aktif odalar
Geçmiş oyunlar:
Kazanan
Kaybeden
Bahis tutarı
Tur sayısı
Tarih
Bahis ayarları yönetimi
Frontend tarafında ayrı bir admin panel geliştirilmemiştir. Zaman ve kapsam önceliği nedeniyle Django Admin yeterli görülmüştür.

12. Kurulum
Backend
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 8000

Frontend
cd frontend
npm install
npm run dev

Frontend: http://localhost:5173
Backend: http://127.0.0.1:8000

13. Varsayımlar
E-posta doğrulama mock kabul edilmiştir
Gerçek para kullanılmamaktadır
Admin panel için Django Admin yeterli görülmüştür
WebSocket bağlantı kopma senaryoları temel seviyede ele alınmıştır

14. Bilerek Yapılmayanlar
Frontend tarafında özel bir admin panel UI
Oyun süresi için gelişmiş analytics
WebSocket reconnect ve timeout senaryoları

