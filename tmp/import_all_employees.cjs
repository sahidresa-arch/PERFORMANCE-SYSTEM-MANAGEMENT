const fs = require('fs');

const bgmEmployees = [
  { id: 'bgm_1', nik: '01063111762', name: 'Muhammad Fahmi', jabatan: 'Technical Team Lead', divisi: 'Cinema', outletId: 'bogor-great-mall-xxi', gender: 'L', statusKerja: 'Tetap', tanggalKontrak: '2026-07-09', habisKontrak: '2030-07-09', phone: '-' },
  { id: 'bgm_2', nik: '01056121662', name: 'Wisma Sajuta', jabatan: 'Technical', divisi: 'Cinema', outletId: 'bogor-great-mall-xxi', gender: 'L', statusKerja: 'Tetap', tanggalKontrak: '2026-07-09', habisKontrak: '2030-07-09', phone: '-' },
  { id: 'bgm_3', nik: '00000012167', name: 'Sahrizal', jabatan: 'Technical', divisi: 'Cinema', outletId: 'bogor-great-mall-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-07-01', habisKontrak: '2027-06-30', phone: '-' },
  { id: 'bgm_4', nik: '00000014188', name: 'Nia Amelia Aswar', jabatan: 'Guide', divisi: 'Cinema', outletId: 'bogor-great-mall-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-03-24', habisKontrak: '2027-03-23', phone: '-' },
  { id: 'bgm_5', nik: '00000013701', name: 'Dian Herlinawati', jabatan: 'Guide', divisi: 'Cinema', outletId: 'bogor-great-mall-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-12-15', habisKontrak: '2027-12-16', phone: '-' },
  { id: 'bgm_6', nik: 'R17746608', name: 'Azi ardiansyah', jabatan: 'Customer Relation', divisi: 'Cinema', outletId: 'bogor-great-mall-xxi', gender: 'L', statusKerja: 'Tetap', tanggalKontrak: '2026-07-09', habisKontrak: '2030-07-09', phone: '-' },
  { id: 'bgm_7', nik: 'R17748032', name: 'Muhamad alamsah', jabatan: 'Customer Relation', divisi: 'Cinema', outletId: 'bogor-great-mall-xxi', gender: 'L', statusKerja: 'Tetap', tanggalKontrak: '2026-07-09', habisKontrak: '2030-07-09', phone: '-' },
  { id: 'bgm_8', nik: '00000013528', name: 'Ahmad yunus', jabatan: 'Cafe Commis', divisi: 'F&B', outletId: 'bogor-great-mall-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2025-12-01', habisKontrak: '2026-12-01', phone: '-' },
  { id: 'bgm_9', nik: '00000017283', name: 'Dika Pratama', jabatan: 'Cafe Mixologist', divisi: 'F&B', outletId: 'bogor-great-mall-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2025-09-22', habisKontrak: '2026-09-21', phone: '-' },
  { id: 'bgm_10', nik: '00000011696', name: 'M syahroji', jabatan: 'Cafe Mixologist', divisi: 'F&B', outletId: 'bogor-great-mall-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-06-16', habisKontrak: '2027-07-16', phone: '-' },
  { id: 'bgm_11', nik: '00000012332', name: 'Lusi Julianti', jabatan: 'Cafe Cashier', divisi: 'F&B', outletId: 'bogor-great-mall-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-07-15', habisKontrak: '2027-07-15', phone: '-' },
  { id: 'bgm_12', nik: '00000016088', name: 'Winda Wulansari', jabatan: 'Cafe Cashier', divisi: 'F&B', outletId: 'bogor-great-mall-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-04-14', habisKontrak: '2027-04-14', phone: '-' },
  { id: 'bgm_13', nik: '00000019511', name: 'Suci Aulia', jabatan: 'Cafe Cashier', divisi: 'F&B', outletId: 'bogor-great-mall-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-05-16', habisKontrak: '2027-04-14', phone: '-' },
  { id: 'bgm_14', nik: '00000017630', name: 'Hazri Farhan Arafah', jabatan: 'Cafe Commis', divisi: 'F&B', outletId: 'bogor-great-mall-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2025-10-23', habisKontrak: '2026-10-22', phone: '-' },
  { id: 'bgm_15', nik: '00000014529', name: 'Dian Ramadhanty', jabatan: 'Cinema Supervisor', divisi: 'Cinema', outletId: 'bogor-great-mall-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-03-25', habisKontrak: '2027-03-24', phone: '-' },
];

const botaniEmployees = [
  { id: 'bot_1', nik: '11064163712', name: 'RIDWANSYAH', jabatan: 'Cinema Manager', divisi: 'Cinema', outletId: 'botani-xxi', gender: 'L', statusKerja: 'Tetap', tanggalKontrak: '2026-07-15', habisKontrak: '2030-07-15', phone: '-' },
  { id: 'bot_2', nik: '00000011698', name: 'TRIA DEWI YULIANTI', jabatan: 'Cinema Supervisor', divisi: 'Cinema', outletId: 'botani-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-06-15', habisKontrak: '2027-07-15', phone: '-' },
  { id: 'bot_3', nik: '00000015902', name: 'ICA NURUL ANISAH PUTRI', jabatan: 'Guide', divisi: 'Cinema', outletId: 'botani-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-04-15', habisKontrak: '2027-04-15', phone: '-' },
  { id: 'bot_4', nik: '01057131664', name: 'ANDRIANSYAH SUMADJI', jabatan: 'Technical Team Lead', divisi: 'Cinema', outletId: 'botani-xxi', gender: 'L', statusKerja: 'Tetap', tanggalKontrak: '2026-07-15', habisKontrak: '2030-07-15', phone: '-' },
  { id: 'bot_5', nik: '01057961695', name: 'TARYONO', jabatan: 'Technical', divisi: 'Cinema', outletId: 'botani-xxi', gender: 'L', statusKerja: 'Tetap', tanggalKontrak: '2026-07-15', habisKontrak: '2030-07-15', phone: '-' },
  { id: 'bot_6', nik: '01057198736', name: 'M DANU SAPUTRA', jabatan: 'Customer Relation', divisi: 'Cinema', outletId: 'botani-xxi', gender: 'L', statusKerja: 'Tetap', tanggalKontrak: '2026-07-15', habisKontrak: '2030-07-15', phone: '-' },
  { id: 'bot_7', nik: '00000019518', name: 'RIZKI RAMADHAN', jabatan: 'Technical', divisi: 'Cinema', outletId: 'botani-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-05-15', habisKontrak: '2027-05-15', phone: '-' },
  { id: 'bot_8', nik: '00000025053', name: 'Ratu Frasti Syahna', jabatan: 'Guide', divisi: 'Cinema', outletId: 'botani-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-03-16', habisKontrak: '2027-03-16', phone: '-' },
  { id: 'bot_9', nik: '00000019562', name: 'Ghamal Bunga', jabatan: 'Guide', divisi: 'Cinema', outletId: 'botani-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-05-15', habisKontrak: '2027-05-15', phone: '-' },
  { id: 'bot_10', nik: '00000021867', name: 'Amanda Lidiya Sari', jabatan: 'Guide', divisi: 'Cinema', outletId: 'botani-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-01-01', habisKontrak: '2026-12-31', phone: '-' },
  { id: 'bot_11', nik: '00000020158', name: 'Muhamad Kahfi Harbowo', jabatan: 'Technical', divisi: 'Cinema', outletId: 'botani-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-06-25', habisKontrak: '2027-06-25', phone: '-' },
  { id: 'bot_12', nik: '00000011440', name: 'Hamzah Warisi', jabatan: 'Cafe Commis', divisi: 'F&B', outletId: 'botani-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-06-01', habisKontrak: '2027-05-31', phone: '-' },
  { id: 'bot_13', nik: '00000017691', name: 'R. M. Irsan', jabatan: 'Cafe Commis', divisi: 'F&B', outletId: 'botani-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2025-10-04', habisKontrak: '2026-10-04', phone: '-' },
  { id: 'bot_14', nik: '00000024053', name: 'Reza Fachlevy', jabatan: 'Cafe Commis', divisi: 'F&B', outletId: 'botani-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-07-18', habisKontrak: '2027-07-18', phone: '-' },
  { id: 'bot_15', nik: '00000011962', name: 'Toto Dwi Septianto', jabatan: 'Mixologist', divisi: 'F&B', outletId: 'botani-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-06-25', habisKontrak: '2027-06-25', phone: '-' },
  { id: 'bot_16', nik: '00000014502', name: 'Putri Salsabila', jabatan: 'Cafe Cashier', divisi: 'F&B', outletId: 'botani-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-03-25', habisKontrak: '2027-03-24', phone: '-' },
  { id: 'bot_17', nik: '00000017688', name: 'Adilla Agrien Binangkit', jabatan: 'Cafe Cashier', divisi: 'F&B', outletId: 'botani-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2025-10-24', habisKontrak: '2026-10-24', phone: '-' },
  { id: 'bot_18', nik: '00000019489', name: 'Samsul Harahap', jabatan: 'Cafe Cashier', divisi: 'F&B', outletId: 'botani-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-05-16', habisKontrak: '2027-05-15', phone: '-' },
  { id: 'bot_19', nik: '00000020172', name: 'Nur Sheva Salsabila', jabatan: 'Cafe Cashier', divisi: 'F&B', outletId: 'botani-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-06-25', habisKontrak: '2027-06-24', phone: '-' },
  { id: 'bot_20', nik: '00000020941', name: 'Amanda', jabatan: 'Cafe Cashier', divisi: 'F&B', outletId: 'botani-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2025-09-16', habisKontrak: '2026-09-15', phone: '-' },
  { id: 'bot_21', nik: '00000025877', name: 'Anugrah Kristama', jabatan: 'Accounting Officer', divisi: 'F&B', outletId: 'botani-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-07-16', habisKontrak: '2027-07-15', phone: '-' },
  { id: 'bot_22', nik: '00000024330', name: 'NENG SILVA', jabatan: 'Cafe Cashier', divisi: 'F&B', outletId: 'botani-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2025-11-29', habisKontrak: '2026-11-29', phone: '-' },
  { id: 'bot_23', nik: '00000017326', name: 'SITI NURMAYANI AGUSTIN', jabatan: 'Cafe Cashier', divisi: 'F&B', outletId: 'botani-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2025-09-27', habisKontrak: '2026-09-27', phone: '-' },
  { id: 'bot_24', nik: '00000014638', name: 'FAHRUR ROZI', jabatan: 'Mixologist', divisi: 'F&B', outletId: 'botani-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-07-21', habisKontrak: '2027-07-21', phone: '-' },
];

const boxiesEmployees = [
  { id: 'box_1', nik: '00000011990', name: 'Fathin Adji Pratama', jabatan: 'Technical Team Lead', divisi: 'Cinema', outletId: 'boxies-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-06-25', habisKontrak: '2027-06-24', phone: '-' },
  { id: 'box_2', nik: '00000020386', name: 'Adam Zacky Fadilah', jabatan: 'Cafe Mixologist', divisi: 'Cinema', outletId: 'boxies-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-07-16', habisKontrak: '2027-07-15', phone: '-' },
  { id: 'box_3', nik: '00000020157', name: 'Teguh Budianto', jabatan: 'Technical', divisi: 'Cinema', outletId: 'boxies-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-06-25', habisKontrak: '2027-06-24', phone: '-' },
  { id: 'box_4', nik: '00000025751', name: 'Sara Deva Afkara', jabatan: 'Cafe Cashier', divisi: 'F&B', outletId: 'boxies-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-06-25', habisKontrak: '2027-06-24', phone: '-' },
  { id: 'box_5', nik: '00000025679', name: 'Aprilia DW 3 Bln', jabatan: 'Cafe Cashier', divisi: 'F&B', outletId: 'boxies-xxi', gender: 'P', statusKerja: 'Magang', tanggalKontrak: '2026-06-08', habisKontrak: '2026-09-07', phone: '-' },
  { id: 'box_6', nik: '00000025095', name: 'Muhamad Buzairimi', jabatan: 'Cafe Commis', divisi: 'Cinema', outletId: 'boxies-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-03-14', habisKontrak: '2027-03-15', phone: '-' },
  { id: 'box_7', nik: '00000014501', name: 'Ferdi Maulana Rasyid', jabatan: 'Cafe Mixologist', divisi: 'F&B', outletId: 'boxies-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-03-25', habisKontrak: '2027-03-24', phone: '-' },
  { id: 'box_8', nik: '00000014503', name: 'Resa Novianti', jabatan: 'Cafe Cashier', divisi: 'F&B', outletId: 'boxies-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-03-25', habisKontrak: '2027-03-24', phone: '-' },
  { id: 'box_9', nik: '00000014189', name: 'Wati Herawati', jabatan: 'Cafe Cashier', divisi: 'F&B', outletId: 'boxies-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-03-25', habisKontrak: '2027-03-24', phone: '-' },
  { id: 'box_10', nik: '700199', name: 'Mirantie Maulidya Rosdayana', jabatan: 'Cinema Supervisor', divisi: 'Cinema', outletId: 'boxies-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-03-25', habisKontrak: '2027-03-24', phone: '-' },
  { id: 'box_11', nik: '00000022095', name: 'Tiara Destianti Putri', jabatan: 'Guide', divisi: 'Cinema', outletId: 'boxies-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-02-01', habisKontrak: '2027-01-31', phone: '-' },
  { id: 'box_12', nik: '00000024294', name: 'Rany Bunardi', jabatan: 'Guide', divisi: 'Cinema', outletId: 'boxies-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2025-11-01', habisKontrak: '2026-10-31', phone: '-' },
  { id: 'box_13', nik: '03058933281', name: 'Sardiyanto', jabatan: 'Cinema Manager', divisi: 'Cinema', outletId: 'boxies-xxi', gender: 'L', statusKerja: 'Tetap', tanggalKontrak: '1993-04-21', habisKontrak: '2030-04-21', phone: '-' },
  { id: 'box_14', nik: '00000007209', name: 'Mega Setiawan', jabatan: 'Customer Relation', divisi: 'Cinema', outletId: 'boxies-xxi', gender: 'L', statusKerja: 'Tetap', tanggalKontrak: '2020-01-24', habisKontrak: '2030-01-24', phone: '-' },
  { id: 'box_15', nik: '00000017689', name: 'FARHAN MAULANA CONTRACK 3', jabatan: 'Cafe Commis', divisi: 'F&B', outletId: 'boxies-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2025-10-24', habisKontrak: '2026-10-24', phone: '-' },
  { id: 'box_16', nik: '01057071673', name: 'Febian PERMANENT', jabatan: 'Technical', divisi: 'Cinema', outletId: 'boxies-xxi', gender: 'L', statusKerja: 'Tetap', tanggalKontrak: '2007-11-07', habisKontrak: '2030-11-07', phone: '-' },
];

const btmEmployees = [
  { id: 'btm_1', nik: '01063101767', name: 'Sutan Jamaludin Lubis', jabatan: 'Technical', divisi: 'Cinema', outletId: 'btm-xxi', gender: 'L', statusKerja: 'Tetap', tanggalKontrak: '2026-06-20', habisKontrak: '2030-06-20', phone: '-' },
  { id: 'btm_2', nik: '00000025107', name: 'Cindy Nurrahmawati', jabatan: 'Guide', divisi: 'Cinema', outletId: 'btm-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-03-16', habisKontrak: '2027-03-15', phone: '-' },
  { id: 'btm_3', nik: '00000020159', name: 'Gita Putri Hikmawati', jabatan: 'Guide', divisi: 'Cinema', outletId: 'btm-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-06-25', habisKontrak: '2027-06-24', phone: '-' },
  { id: 'btm_4', nik: '00000020906', name: 'Elis Tiyani', jabatan: 'Guide', divisi: 'Cinema', outletId: 'btm-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2025-09-16', habisKontrak: '2026-09-15', phone: '-' },
  { id: 'btm_5', nik: '00000016492', name: 'Jaka Saputra', jabatan: 'Cafe Commis', divisi: 'F&B', outletId: 'btm-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-05-25', habisKontrak: '2027-05-24', phone: '-' },
  { id: 'btm_6', nik: '03058963277', name: 'Nasrullah', jabatan: 'Technical Team Lead', divisi: 'Cinema', outletId: 'btm-xxi', gender: 'L', statusKerja: 'Tetap', tanggalKontrak: '2026-06-20', habisKontrak: '2030-06-20', phone: '-' },
  { id: 'btm_7', nik: '03058123284', name: 'Ujang Saepudin', jabatan: 'Technical', divisi: 'Cinema', outletId: 'btm-xxi', gender: 'L', statusKerja: 'Tetap', tanggalKontrak: '2026-06-20', habisKontrak: '2030-06-20', phone: '-' },
  { id: 'btm_8', nik: '00000025641', name: 'Intan Nuraeni', jabatan: 'Cafe Cashier', divisi: 'F&B', outletId: 'btm-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-06-16', habisKontrak: '2027-06-15', phone: '-' },
  { id: 'btm_9', nik: '00000009280', name: 'Rizka Halma', jabatan: 'Cafe Cashier', divisi: 'F&B', outletId: 'btm-xxi', gender: 'P', statusKerja: 'Magang', tanggalKontrak: '2026-05-06', habisKontrak: '2026-08-05', phone: '-' },
  { id: 'btm_10', nik: '00000025459', name: 'Rico Jasanta', jabatan: 'Cafe Commis', divisi: 'F&B', outletId: 'btm-xxi', gender: 'L', statusKerja: 'Magang', tanggalKontrak: '2026-08-01', habisKontrak: '2027-07-31', phone: '-' },
  { id: 'btm_11', nik: '00000025699', name: 'Antara Maidani Kaimudin', jabatan: 'Cafe Mixologist', divisi: 'F&B', outletId: 'btm-xxi', gender: 'P', statusKerja: 'Magang', tanggalKontrak: '2026-06-10', habisKontrak: '2026-09-09', phone: '-' },
  { id: 'btm_12', nik: '00000020154', name: 'Citra Melina', jabatan: 'Cafe Cashier', divisi: 'F&B', outletId: 'btm-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-06-25', habisKontrak: '2027-06-24', phone: '-' },
  { id: 'btm_13', nik: '00000025662', name: 'Fellisa Wanda Kristian', jabatan: 'Cafe Cashier', divisi: 'F&B', outletId: 'btm-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-06-16', habisKontrak: '2027-06-15', phone: '-' },
  { id: 'btm_14', nik: '00000023545', name: 'Jeny Indira', jabatan: 'Cafe Cashier', divisi: 'F&B', outletId: 'btm-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-08-01', habisKontrak: '2027-07-31', phone: '-' },
  { id: 'btm_15', nik: '00000025945', name: 'Tustinia Alyawati', jabatan: 'Cafe Cashier', divisi: 'F&B', outletId: 'btm-xxi', gender: 'P', statusKerja: 'Magang', tanggalKontrak: '2026-07-05', habisKontrak: '2026-10-04', phone: '-' },
  { id: 'btm_16', nik: '00000023465', name: 'Ardhito Sayudha Bagas Praditya', jabatan: 'Cafe Mixologist', divisi: 'F&B', outletId: 'btm-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-08-01', habisKontrak: '2027-07-31', phone: '-' },
  { id: 'btm_17', nik: '00000024914', name: 'Ferry Irawan', jabatan: 'Cafe Mixologist', divisi: 'F&B', outletId: 'btm-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-02-16', habisKontrak: '2027-02-15', phone: '-' },
  { id: 'btm_18', nik: '00000012314', name: 'Intan Aprillia Citra', jabatan: 'Cinema Supervisor', divisi: 'Cinema', outletId: 'btm-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2025-07-16', habisKontrak: '2026-07-15', phone: '-' },
  { id: 'btm_19', nik: '00000014765', name: 'Ambar Wulandari', jabatan: 'Cinema Supervisor', divisi: 'Cinema', outletId: 'btm-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-03-25', habisKontrak: '2027-03-24', phone: '-' },
  { id: 'btm_20', nik: '00000025060', name: 'Zagarr Gatin', jabatan: 'Cafe Commis', divisi: 'F&B', outletId: 'btm-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-03-16', habisKontrak: '2027-03-15', phone: '-' },
  { id: 'btm_21', nik: '00000024915', name: 'Melia Dela Sapitri', jabatan: 'Cafe Cashier', divisi: 'F&B', outletId: 'btm-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-02-16', habisKontrak: '2027-02-15', phone: '-' },
  { id: 'btm_22', nik: '00000024427', name: 'Muhamad Faizan Rijali', jabatan: 'Cafe Commis', divisi: 'F&B', outletId: 'btm-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-02-16', habisKontrak: '2027-02-15', phone: '-' },
  { id: 'btm_23', nik: '00000025011', name: 'Abdul Aziz Alfarizi', jabatan: 'Cafe Commis', divisi: 'F&B', outletId: 'btm-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-03-01', habisKontrak: '2027-02-28', phone: '-' },
  { id: 'btm_24', nik: '00000021621', name: 'Aditya Pramesti', jabatan: 'Cafe Cashier', divisi: 'F&B', outletId: 'btm-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2025-12-01', habisKontrak: '2026-11-30', phone: '-' },
  { id: 'btm_25', nik: '00000014509', name: 'Nurkholifah Surahman', jabatan: 'Cafe Cashier', divisi: 'F&B', outletId: 'btm-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-03-25', habisKontrak: '2027-03-24', phone: '-' },
  { id: 'btm_26', nik: '00000014540', name: 'Guslatifah Sapitri', jabatan: 'Cafe Cashier', divisi: 'F&B', outletId: 'btm-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-03-25', habisKontrak: '2027-03-24', phone: '-' },
];

const cibinongEmployees = [
  { id: 'cib_1', nik: '00000014660', name: 'Ratna Safitri', jabatan: 'Cinema Supervisor', divisi: 'Cinema', outletId: 'cibinong-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-03-26', habisKontrak: '2027-03-25', phone: '-' },
  { id: 'cib_2', nik: '01060021734', name: 'YULIANTO', jabatan: 'Technical', divisi: 'Cinema', outletId: 'cibinong-xxi', gender: 'L', statusKerja: 'Tetap', tanggalKontrak: '2002-11-20', habisKontrak: '2030-11-20', phone: '-' },
  { id: 'cib_3', nik: '01060141713', name: 'IRFAN MAULANA', jabatan: 'Technical Team Lead', divisi: 'Cinema', outletId: 'cibinong-xxi', gender: 'L', statusKerja: 'Tetap', tanggalKontrak: '2011-01-18', habisKontrak: '2030-01-18', phone: '-' },
  { id: 'cib_4', nik: '00000021483', name: 'Ridho Febriandi', jabatan: 'Technical', divisi: 'Cinema', outletId: 'cibinong-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-11-16', habisKontrak: '2027-11-15', phone: '-' },
  { id: 'cib_5', nik: '00000022480', name: 'Dhea Marcella Putri', jabatan: 'Guide', divisi: 'Cinema', outletId: 'cibinong-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-04-01', habisKontrak: '2027-03-31', phone: '-' },
  { id: 'cib_6', nik: '00000015444', name: 'Ira Mayasari', jabatan: 'Guide', divisi: 'Cinema', outletId: 'cibinong-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-04-16', habisKontrak: '2027-04-15', phone: '-' },
  { id: 'cib_7', nik: '00000016097', name: 'Vebi Suci Kristanti', jabatan: 'Guide', divisi: 'Cinema', outletId: 'cibinong-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-04-16', habisKontrak: '2027-04-15', phone: '-' },
  { id: 'cib_8', nik: '01032161108', name: 'Fachri Mohamad Wahyudin', jabatan: 'Cinema Area Manager', divisi: 'Cinema', outletId: 'cibinong-xxi', gender: 'L', statusKerja: 'Tetap', tanggalKontrak: '2013-07-01', habisKontrak: '2030-07-01', phone: '-' },
];

const cipanasEmployees = [
  { id: 'cip_1', nik: '00000015136', name: 'ADIES FEBRIANSYAH', jabatan: 'Cinema Assistant Manager', divisi: 'Cinema', outletId: 'ciplaz-cipanas-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-03-21', habisKontrak: '2027-03-20', phone: '-' },
  { id: 'cip_2', nik: '00000026373', name: 'Andini Agustini', jabatan: 'Guide', divisi: 'Cinema', outletId: 'ciplaz-cipanas-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-05-01', habisKontrak: '2027-04-30', phone: '-' },
  { id: 'cip_3', nik: '00000025366', name: 'Muhammad Faisal Herwanto', jabatan: 'Technical', divisi: 'Cinema', outletId: 'ciplaz-cipanas-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-05-01', habisKontrak: '2027-04-30', phone: '-' },
  { id: 'cip_4', nik: '00000025367', name: 'Ferdy Firmansyah Putra Hidayat', jabatan: 'Technical', divisi: 'Cinema', outletId: 'ciplaz-cipanas-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-05-01', habisKontrak: '2027-04-30', phone: '-' },
  { id: 'cip_5', nik: '00000025452', name: 'M Jabbar R', jabatan: 'Technical', divisi: 'Cinema', outletId: 'ciplaz-cipanas-xxi', gender: 'L', statusKerja: 'Magang', tanggalKontrak: '2026-06-01', habisKontrak: '2026-08-31', phone: '-' },
  { id: 'cip_6', nik: '00000025525', name: 'Muhaemin', jabatan: 'Cafe Commis', divisi: 'F&B', outletId: 'ciplaz-cipanas-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-06-01', habisKontrak: '2027-05-31', phone: '-' },
  { id: 'cip_7', nik: '00000025526', name: 'Bimaseto Aji Prasetyo Dwiasro', jabatan: 'Cafe Commis', divisi: 'F&B', outletId: 'ciplaz-cipanas-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-06-01', habisKontrak: '2027-05-31', phone: '-' },
  { id: 'cip_8', nik: '00000025375', name: 'Muhamad Adam Abdilah', jabatan: 'Cafe Mixologist', divisi: 'F&B', outletId: 'ciplaz-cipanas-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-05-01', habisKontrak: '2027-04-30', phone: '-' },
  { id: 'cip_9', nik: '00000025524', name: 'M. Yazied Sugiarto', jabatan: 'Cafe Mixologist', divisi: 'F&B', outletId: 'ciplaz-cipanas-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-06-01', habisKontrak: '2027-05-31', phone: '-' },
  { id: 'cip_10', nik: '00000025534', name: 'Parningotan Saputra Sinaga', jabatan: 'Cafe Mixologist', divisi: 'F&B', outletId: 'ciplaz-cipanas-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-06-01', habisKontrak: '2027-05-31', phone: '-' },
  { id: 'cip_11', nik: '00000025226', name: 'Fatimah Zahra', jabatan: 'Cafe Cashier', divisi: 'F&B', outletId: 'ciplaz-cipanas-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-07-16', habisKontrak: '2027-07-15', phone: '-' },
  { id: 'cip_12', nik: '000000253005', name: 'Rahayu Qoyumi', jabatan: 'Guide', divisi: 'Cinema', outletId: 'ciplaz-cipanas-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-07-16', habisKontrak: '2027-07-15', phone: '-' },
  { id: 'cip_13', nik: '00000025369', name: 'Rini Alifriani', jabatan: 'Cafe Cashier', divisi: 'F&B', outletId: 'ciplaz-cipanas-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-05-01', habisKontrak: '2027-04-30', phone: '-' },
  { id: 'cip_14', nik: '00000025371', name: 'Dina Silvia', jabatan: 'Cafe Cashier', divisi: 'F&B', outletId: 'ciplaz-cipanas-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-05-01', habisKontrak: '2027-04-30', phone: '-' },
  { id: 'cip_15', nik: '00000025522', name: 'Laura Nur Fatimah Rochmat', jabatan: 'Cafe Cashier', divisi: 'F&B', outletId: 'ciplaz-cipanas-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-06-01', habisKontrak: '2027-05-31', phone: '-' },
];

const parungEmployees = [
  { id: 'prg_1', nik: '00000015238', name: 'Muhamad Lufiyanto', jabatan: 'Technical', divisi: 'Cinema', outletId: 'ciplaz-parung-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-03-25', habisKontrak: '2027-03-24', phone: '-' },
  { id: 'prg_2', nik: '03059973298', name: 'Hasan Basri', jabatan: 'Technical', divisi: 'Cinema', outletId: 'ciplaz-parung-xxi', gender: 'L', statusKerja: 'Tetap', tanggalKontrak: '2026-06-20', habisKontrak: '2030-06-20', phone: '-' },
  { id: 'prg_3', nik: '00000014527', name: 'Trisna Andrian', jabatan: 'Technical Team Lead', divisi: 'Cinema', outletId: 'ciplaz-parung-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-03-25', habisKontrak: '2027-03-24', phone: '-' },
  { id: 'prg_4', nik: '00000025072', name: 'Ervina', jabatan: 'Cafe Cashier', divisi: 'F&B', outletId: 'ciplaz-parung-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-03-16', habisKontrak: '2027-03-15', phone: '-' },
  { id: 'prg_5', nik: '01059198839', name: 'Wulan Maulida', jabatan: 'Guide', divisi: 'Cinema', outletId: 'ciplaz-parung-xxi', gender: 'P', statusKerja: 'Tetap', tanggalKontrak: '2025-10-16', habisKontrak: '2030-10-16', phone: '-' },
  { id: 'prg_6', nik: '00000023255', name: 'Ardita Wulandari', jabatan: 'Guide', divisi: 'Cinema', outletId: 'ciplaz-parung-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-07-01', habisKontrak: '2027-06-30', phone: '-' },
  { id: 'prg_7', nik: '00000015590', name: 'Afrida Isnaini Farhana', jabatan: 'Cafe Cashier', divisi: 'F&B', outletId: 'ciplaz-parung-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-04-16', habisKontrak: '2027-04-15', phone: '-' },
  { id: 'prg_8', nik: '00000018692', name: 'Diaz Ayuni Paradita', jabatan: 'Cafe Cashier', divisi: 'F&B', outletId: 'ciplaz-parung-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-02-16', habisKontrak: '2027-02-15', phone: '-' },
  { id: 'prg_9', nik: '00000020722', name: 'Sri Wahyuni', jabatan: 'Cafe Cashier', divisi: 'F&B', outletId: 'ciplaz-parung-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2025-08-16', habisKontrak: '2027-08-14', phone: '-' },
  { id: 'prg_10', nik: '00000025020', name: 'Marshelyna', jabatan: 'Cafe Cashier', divisi: 'F&B', outletId: 'ciplaz-parung-xxi', gender: 'P', statusKerja: 'Kontrak', tanggalKontrak: '2026-03-01', habisKontrak: '2027-02-28', phone: '-' },
  { id: 'prg_11', nik: '00000013394', name: 'Rendy Birawan', jabatan: 'Cafe Mixologist', divisi: 'F&B', outletId: 'ciplaz-parung-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2025-11-23', habisKontrak: '2026-11-22', phone: '-' },
  { id: 'prg_12', nik: '00000017629', name: 'Anggih Prayoga', jabatan: 'Cafe Mixologist', divisi: 'F&B', outletId: 'ciplaz-parung-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2025-10-23', habisKontrak: '2026-10-22', phone: '-' },
  { id: 'prg_13', nik: '00000019549', name: 'Rifky Sayyidina Alwi', jabatan: 'Cafe Commis', divisi: 'F&B', outletId: 'ciplaz-parung-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-05-16', habisKontrak: '2027-05-15', phone: '-' },
  { id: 'prg_14', nik: '00000014203', name: 'Nurul Fitriani', jabatan: 'Cinema Assistant Manager', divisi: 'Cinema', outletId: 'ciplaz-parung-xxi', gender: 'L', statusKerja: 'Kontrak', tanggalKontrak: '2026-03-25', habisKontrak: '2027-03-24', phone: '-' },
];

console.log('Total counts:');
console.log('BGM:', bgmEmployees.length);
console.log('Botani:', botaniEmployees.length);
console.log('Boxies:', boxiesEmployees.length);
console.log('BTM:', btmEmployees.length);
console.log('Cibinong:', cibinongEmployees.length);
console.log('Cipanas:', cipanasEmployees.length);
console.log('Parung:', parungEmployees.length);
