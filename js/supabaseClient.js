/**
 * SUPABASE CLIENT & AUTHENTICATION CONTROLLER
 * Quản lý kết nối Supabase, Đăng ký, Đăng nhập, Phân quyền Admin duyệt thành viên,
 * và Lưu trữ mẫu tem Cloud theo từng tài khoản.
 */

const SUPABASE_URL = 'https://bjqxyqhkyhqihprjhuwg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqcXh5cWhreWhxaWhwcmpodXdnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkxMDc5MTAsImV4cCI6MjEwNDY4MzkxMH0.XSZmLIE1kh39YjPJdkuonUGcOyilsaIZXk_nnY7ADgE';

// Khởi tạo Supabase Client
let _supabase = null;

function getSupabase() {
  if (!_supabase) {
    if (typeof window.supabase !== 'undefined' && window.supabase.createClient) {
      _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } else {
      console.warn('Thư viện @supabase/supabase-js chưa sẵn sàng.');
    }
  }
  return _supabase;
}

const SupabaseAuth = {
  currentUser: null,
  currentProfile: null,
  authListeners: [],

  async init() {
    const client = getSupabase();
    if (!client) return null;

    try {
      // 1. Kiểm tra session hiện tại
      const { data: { session }, error } = await client.auth.getSession();
      if (session && session.user) {
        await this.loadUserProfile(session.user);
      } else {
        this.currentUser = null;
        this.currentProfile = null;
      }

      // 2. Lắng nghe thay đổi trạng thái đăng nhập
      client.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          await this.loadUserProfile(session.user);
        } else if (event === 'SIGNED_OUT') {
          this.currentUser = null;
          this.currentProfile = null;
        }
        this.notifyListeners();
      });

      // 3. Khởi tạo lắng nghe Realtime thông báo người dùng mới cho Admin
      this.initRealtimeWatcher();

      this.notifyListeners();
      return this.currentUser;
    } catch (err) {
      console.error('Lỗi khởi tạo Supabase Auth:', err);
      return null;
    }
  },

  onStateChanged(callback) {
    if (typeof callback === 'function') {
      this.authListeners.push(callback);
    }
  },

  notifyListeners() {
    this.authListeners.forEach(cb => {
      try {
        cb(this.currentUser, this.currentProfile);
      } catch (e) {
        console.error('Error in auth listener callback:', e);
      }
    });
  },

  async loadUserProfile(user) {
    this.currentUser = user;
    const client = getSupabase();
    if (!client || !user) return;

    try {
      const { data, error } = await client
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (data) {
        this.currentProfile = data;
      } else {
        // Dự phòng tạo profile nếu trigger chưa kịp tạo
        this.currentProfile = {
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || '',
          phone: user.user_metadata?.phone || '',
          role: 'user',
          is_approved: false
        };
      }
    } catch (err) {
      console.error('Lỗi tải thông tin profile:', err);
    }
  },

  /**
   * ĐĂNG KÝ TÀI KHOẢN MỚI
   */
  async signUp({ email, password, fullName, phone }) {
    const client = getSupabase();
    if (!client) throw new Error('Chưa kết nối được với máy chủ.');

    const cleanEmail = email.trim().toLowerCase();
    const { data, error } = await client.auth.signUp({
      email: cleanEmail,
      password: password,
      options: {
        data: {
          full_name: fullName.trim(),
          phone: phone.trim()
        }
      }
    });

    if (error) throw error;
    return data;
  },

  /**
   * ĐĂNG NHẬP
   */
  async signIn({ email, password }) {
    const client = getSupabase();
    if (!client) throw new Error('Chưa kết nối được với máy chủ.');

    const cleanEmail = email.trim().toLowerCase();
    const { data, error } = await client.auth.signInWithPassword({
      email: cleanEmail,
      password: password
    });

    if (error) throw error;

    // Tải profile để kiểm tra trạng thái duyệt
    if (data && data.user) {
      await this.loadUserProfile(data.user);

      // Kiểm tra tài khoản đã được Admin duyệt chưa
      if (!this.isAdmin() && !this.isApproved()) {
        // Tự động đăng xuất nếu chưa duyệt
        await client.auth.signOut();
        this.currentUser = null;
        this.currentProfile = null;
        throw new Error('Tài khoản của bạn đang chờ Admin phê duyệt. Vui lòng liên hệ Admin để được kích hoạt!');
      }
    }

    return data;
  },

  /**
   * ĐĂNG XUẤT
   */
  async signOut() {
    const client = getSupabase();
    if (!client) return;
    await client.auth.signOut();
    this.currentUser = null;
    this.currentProfile = null;
    this.notifyListeners();
  },

  isLoggedIn() {
    return Boolean(this.currentUser);
  },

  isAdmin() {
    return this.currentProfile?.role === 'admin';
  },

  isApproved() {
    // Admin mặc định được coi là đã duyệt
    return Boolean(this.currentProfile?.is_approved || this.isAdmin());
  },

  /**
   * ADMIN: LẤY DANH SÁCH TÀI KHOẢN CHỜ DUYỆT
   */
  async getPendingUsers() {
    const client = getSupabase();
    if (!client || !this.isAdmin()) return [];

    const { data, error } = await client
      .from('profiles')
      .select('*')
      .eq('is_approved', false)
      .neq('role', 'admin')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Lỗi lấy danh sách chờ duyệt:', error);
      return [];
    }
    return data || [];
  },

  /**
   * ADMIN: LẤY TẤT CẢ TÀI KHOẢN
   */
  async getAllUsers() {
    const client = getSupabase();
    if (!client || !this.isAdmin()) return [];

    const { data, error } = await client
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Lỗi lấy danh sách user:', error);
      return [];
    }
    return data || [];
  },

  /**
   * ADMIN: DUYỆT TÀI KHOẢN
   */
  async approveUser(userId) {
    const client = getSupabase();
    if (!client || !this.isAdmin()) throw new Error('Chỉ Admin mới có quyền duyệt.');

    const { error } = await client
      .from('profiles')
      .update({ is_approved: true })
      .eq('id', userId);

    if (error) throw error;
    return true;
  },

  /**
   * ADMIN: TỪ CHỐI HOẶC KHÓA TÀI KHOẢN
   */
  async rejectUser(userId) {
    const client = getSupabase();
    if (!client || !this.isAdmin()) throw new Error('Chỉ Admin mới có quyền từ chối.');

    const { error } = await client
      .from('profiles')
      .update({ is_approved: false })
      .eq('id', userId);

    if (error) throw error;
    return true;
  },

  /**
   * LƯU MẪU TEM LÊN CLOUD
   */
  async saveCloudPreset(name, data) {
    const client = getSupabase();
    if (!client || !this.isLoggedIn()) {
      throw new Error('Bạn cần đăng nhập để lưu mẫu lên đám mây.');
    }

    const payload = {
      user_id: this.currentUser.id,
      name: name.trim(),
      data: data,
      author_name: this.currentProfile?.full_name || this.currentUser.email,
      author_email: this.currentUser.email,
      updated_at: new Date().toISOString()
    };

    const { data: inserted, error } = await client
      .from('custom_presets')
      .insert([payload])
      .select()
      .single();

    if (error) throw error;
    return inserted;
  },

  /**
   * LẤY DANH SÁCH MẪU TEM CLOUD
   * - Nếu là Admin: Lấy tất cả mẫu của mọi người
   * - Nếu là User: Lấy mẫu của chính mình
   */
  async getCloudPresets() {
    const client = getSupabase();
    if (!client || !this.isLoggedIn()) return [];

    let query = client.from('custom_presets').select('*').order('created_at', { ascending: false });

    // Nếu không phải Admin thì chỉ lấy mẫu của mình
    if (!this.isAdmin()) {
      query = query.eq('user_id', this.currentUser.id);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Lỗi lấy mẫu tem Cloud:', error);
      return [];
    }
    return data || [];
  },

  /**
   * XÓA MẪU TEM CLOUD
   */
  async deleteCloudPreset(presetId) {
    const client = getSupabase();
    if (!client || !this.isLoggedIn()) return false;

    let query = client.from('custom_presets').delete().eq('id', presetId);

    // Nếu không phải admin thì chỉ được xóa mẫu của chính mình
    if (!this.isAdmin()) {
      query = query.eq('user_id', this.currentUser.id);
    }

    const { error } = await query;
    if (error) {
      console.error('Lỗi xóa mẫu tem Cloud:', error);
      return false;
    }
    return true;
  },

  /**
   * LẮNG NGHE REALTIME CHO ADMIN (BÁO CHUÔNG ĐỎ KHI CÓ USER MỚI)
   */
  initRealtimeWatcher() {
    const client = getSupabase();
    if (!client) return;

    client
      .channel('public:profiles')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, payload => {
        // Cập nhật lại số lượng chờ duyệt và thông báo
        if (typeof window.onSupabaseRealtimeEvent === 'function') {
          window.onSupabaseRealtimeEvent(payload);
        }
      })
      .subscribe();
  }
};

window.SupabaseAuth = SupabaseAuth;
