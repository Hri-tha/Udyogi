// src/screens/worker/WorkerProfileScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  StatusBar,
  Modal,
  TextInput,
  Dimensions,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../constants/colors';
import { 
  fetchWorkerRatings, 
  fetchWorkerApplications, 
  fetchWorkerEarnings,
  getWorkerEarningsStats 
} from '../../services/database';

const { width } = Dimensions.get('window');

const WorkerProfileScreen = ({ navigation }) => {
  const { user, userProfile, logout } = useAuth();
  const [ratings, setRatings] = useState([]);
  const [applications, setApplications] = useState([]);
  const [earnings, setEarnings] = useState([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [stats, setStats] = useState({
    totalJobs: 0,
    completedJobs: 0,
    acceptedJobs: 0,
    averageRating: 0,
    totalEarnings: 0,
    monthlyEarnings: 0,
    averageEarning: 0,
  });

  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    // Fetch ratings
    const ratingsResult = await fetchWorkerRatings(user.uid);
    if (ratingsResult.success) {
      setRatings(ratingsResult.ratings);
      calculateAverageRating(ratingsResult.ratings);
    }

    // Fetch applications for stats
    const appsResult = await fetchWorkerApplications(user.uid);
    if (appsResult.success) {
      setApplications(appsResult.applications);
      calculateStats(appsResult.applications);
    }

    // Fetch earnings data
    await loadEarningsData();
  };

  const loadEarningsData = async () => {
    const earningsResult = await fetchWorkerEarnings(user.uid);
    if (earningsResult.success) {
      setEarnings(earningsResult.earnings);
    }

    const statsResult = await getWorkerEarningsStats(user.uid);
    if (statsResult.success) {
      setStats(prev => ({
        ...prev,
        totalEarnings: statsResult.stats.totalEarnings || 0,
        monthlyEarnings: statsResult.stats.monthlyEarnings || 0,
        averageEarning: statsResult.stats.averageEarning || 0,
      }));
    }
  };

  const calculateAverageRating = (ratingsData) => {
    if (ratingsData.length === 0) return;
    const sum = ratingsData.reduce((acc, r) => acc + r.rating, 0);
    const avg = (sum / ratingsData.length).toFixed(1);
    setStats(prev => ({ ...prev, averageRating: parseFloat(avg) }));
  };

  const calculateStats = (appsData) => {
    const completed = appsData.filter(a => a.status === 'completed').length;
    const accepted = appsData.filter(a => a.status === 'accepted').length;

    setStats(prev => ({
      ...prev,
      totalJobs: appsData.length,
      completedJobs: completed,
      acceptedJobs: accepted,
    }));
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
            } catch (error) {
              Alert.alert('Error', 'Failed to logout');
            }
          }
        }
      ]
    );
  };

  const renderStars = (rating) => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Text key={star} style={styles.star}>
            {star <= rating ? '⭐' : '☆'}
          </Text>
        ))}
      </View>
    );
  };

  const StatCard = ({ icon, value, label, color = colors.primary }) => (
    <View style={styles.statCard}>
      <View style={[styles.statIconContainer, { backgroundColor: color + '20' }]}>
        <Text style={styles.statIcon}>{icon}</Text>
      </View>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  const SkillBadge = ({ skill }) => (
    <View style={styles.skillBadge}>
      <Text style={styles.skillText}>{skill}</Text>
    </View>
  );

  const ReviewCard = ({ review }) => (
    <View style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        <View style={styles.reviewerInfo}>
          <View style={styles.reviewerAvatar}>
            <Text style={styles.reviewerAvatarText}>
              {review.employerName?.charAt(0) || 'E'}
            </Text>
          </View>
          <View style={styles.reviewerDetails}>
            <Text style={styles.reviewerName}>{review.employerName}</Text>
            <Text style={styles.reviewDate}>
              {review.createdAt?.toDate?.()?.toLocaleDateString() || 'Recent'}
            </Text>
          </View>
        </View>
        {renderStars(review.rating)}
      </View>
      {review.comment && (
        <Text style={styles.reviewComment}>{review.comment}</Text>
      )}
      <Text style={styles.reviewJobTitle}>Job: {review.jobTitle}</Text>
    </View>
  );

  const EarningCard = ({ earning }) => (
    <View style={styles.earningCard}>
      <View style={styles.earningHeader}>
        <View style={styles.earningInfo}>
          <Text style={styles.earningJob}>{earning.jobTitle}</Text>
          <Text style={styles.earningEmployer}>{earning.employerName}</Text>
          <Text style={styles.earningDate}>
            {earning.paidAt?.toDate?.()?.toLocaleDateString() || 'Recent'}
          </Text>
        </View>
        <View style={styles.earningAmount}>
          <Text style={styles.earningValue}>₹{earning.amount}</Text>
          <View style={[
            styles.paymentMethodBadge,
            { backgroundColor: earning.paymentMethod === 'online' ? '#2196F3' : '#4CAF50' }
          ]}>
            <Text style={styles.paymentMethodText}>
              {earning.paymentMethod === 'online' ? 'Online' : 'Cash'}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Profile</Text>
        <TouchableOpacity 
          onPress={() => setShowEditModal(true)}
          style={styles.editButton}
        >
          <Text style={styles.editButtonText}>✏️</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Header Card */}
        <View style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {userProfile?.name?.charAt(0)?.toUpperCase() || 'W'}
                </Text>
              </View>
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedIcon}>✓</Text>
              </View>
            </View>

            <View style={styles.profileInfo}>
              <Text style={styles.name}>{userProfile?.name || 'Worker'}</Text>
              <Text style={styles.email}>{user?.email}</Text>
              
              {/* Rating Display */}
              <View style={styles.ratingSection}>
                {renderStars(Math.round(stats.averageRating))}
                <Text style={styles.ratingText}>
                  {stats.averageRating > 0 ? stats.averageRating.toFixed(1) : 'No ratings'}
                </Text>
                {ratings.length > 0 && (
                  <Text style={styles.ratingCount}>({ratings.length} reviews)</Text>
                )}
              </View>

              {/* Skills */}
              {userProfile?.skills && userProfile.skills.length > 0 && (
                <View style={styles.skillsContainer}>
                  {userProfile.skills.slice(0, 3).map((skill, index) => (
                    <SkillBadge key={index} skill={skill} />
                  ))}
                  {userProfile.skills.length > 3 && (
                    <View style={styles.skillBadge}>
                      <Text style={styles.skillText}>+{userProfile.skills.length - 3}</Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          </View>

          {/* Location & Phone */}
          <View style={styles.contactInfo}>
            {userProfile?.location && (
              <View style={styles.contactItem}>
                <Text style={styles.contactIcon}>📍</Text>
                <Text style={styles.contactText}>{userProfile.location}</Text>
              </View>
            )}
            {userProfile?.phoneNumber && (
              <View style={styles.contactItem}>
                <Text style={styles.contactIcon}>📱</Text>
                <Text style={styles.contactText}>{userProfile.phoneNumber}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Stats Grid */}
        <Text style={styles.sectionTitle}>Work Statistics</Text>
        <View style={styles.statsGrid}>
          <StatCard
            icon="💼"
            value={stats.totalJobs}
            label="Total Jobs"
            color={colors.info}
          />
          <StatCard
            icon="✅"
            value={stats.completedJobs}
            label="Completed"
            color={colors.success}
          />
          <StatCard
            icon="💰"
            value={`₹${stats.totalEarnings}`}
            label="Total Earned"
            color={colors.primary}
          />
          <StatCard
            icon="📈"
            value={`₹${stats.monthlyEarnings}`}
            label="This Month"
            color={colors.warning}
          />
        </View>

        {/* Earnings Summary */}
        <Text style={styles.sectionTitle}>Earnings Summary</Text>
        <View style={styles.earningsSummaryCard}>
          <View style={styles.earningsStats}>
            <View style={styles.earningsStat}>
              <Text style={styles.earningsStatValue}>₹{stats.monthlyEarnings}</Text>
              <Text style={styles.earningsStatLabel}>This Month</Text>
            </View>
            <View style={styles.earningsStat}>
              <Text style={styles.earningsStatValue}>{stats.completedJobs}</Text>
              <Text style={styles.earningsStatLabel}>Jobs Done</Text>
            </View>
            <View style={styles.earningsStat}>
              <Text style={styles.earningsStatValue}>₹{Math.round(stats.averageEarning)}</Text>
              <Text style={styles.earningsStatLabel}>Avg/Job</Text>
            </View>
          </View>
        </View>

        {/* Recent Earnings */}
        {earnings.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Recent Earnings</Text>
            <View style={styles.earningsContainer}>
              {earnings.slice(0, 5).map((earning, index) => (
                <EarningCard key={earning.id || index} earning={earning} />
              ))}
              
              {earnings.length > 5 && (
                <TouchableOpacity style={styles.viewAllButton}>
                  <Text style={styles.viewAllText}>View All Earnings →</Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        )}

        {/* Performance Metrics */}
        <Text style={styles.sectionTitle}>Performance</Text>
        <View style={styles.performanceCard}>
          <View style={styles.performanceItem}>
            <View style={styles.performanceHeader}>
              <Text style={styles.performanceLabel}>Completion Rate</Text>
              <Text style={styles.performanceValue}>
                {stats.totalJobs > 0 
                  ? `${Math.round((stats.completedJobs / stats.totalJobs) * 100)}%`
                  : '0%'}
              </Text>
            </View>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill,
                  { 
                    width: `${stats.totalJobs > 0 
                      ? (stats.completedJobs / stats.totalJobs) * 100 
                      : 0}%`,
                    backgroundColor: colors.success
                  }
                ]}
              />
            </View>
          </View>

          <View style={styles.performanceItem}>
            <View style={styles.performanceHeader}>
              <Text style={styles.performanceLabel}>Average Rating</Text>
              <Text style={styles.performanceValue}>
                {stats.averageRating > 0 ? `${stats.averageRating}/5` : 'N/A'}
              </Text>
            </View>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill,
                  { 
                    width: `${(stats.averageRating / 5) * 100}%`,
                    backgroundColor: colors.warning
                  }
                ]}
              />
            </View>
          </View>

          <View style={styles.performanceItem}>
            <View style={styles.performanceHeader}>
              <Text style={styles.performanceLabel}>Average Earnings</Text>
              <Text style={styles.performanceValue}>₹{Math.round(stats.averageEarning)}</Text>
            </View>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill,
                  { 
                    width: `${Math.min((stats.averageEarning / 5000) * 100, 100)}%`,
                    backgroundColor: colors.info
                  }
                ]}
              />
            </View>
          </View>
        </View>

        {/* All Skills */}
        {userProfile?.skills && userProfile.skills.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Skills & Expertise</Text>
            <View style={styles.allSkillsContainer}>
              {userProfile.skills.map((skill, index) => (
                <SkillBadge key={index} skill={skill} />
              ))}
            </View>
          </>
        )}

        {/* Reviews Section */}
        {ratings.length > 0 && (
          <>
            <View style={styles.reviewsHeader}>
              <Text style={styles.sectionTitle}>Reviews & Ratings</Text>
              <View style={styles.reviewsBadge}>
                <Text style={styles.reviewsBadgeText}>{ratings.length}</Text>
              </View>
            </View>
            
            <View style={styles.reviewsContainer}>
              {ratings.slice(0, 5).map((review, index) => (
                <ReviewCard key={index} review={review} />
              ))}
              
              {ratings.length > 5 && (
                <TouchableOpacity style={styles.viewAllButton}>
                  <Text style={styles.viewAllText}>View All Reviews →</Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        )}

        {/* Personal Information */}
        <Text style={styles.sectionTitle}>Personal Information</Text>
        <View style={styles.infoCard}>
          <InfoRow icon="👤" label="Full Name" value={userProfile?.name || 'Not set'} />
          <InfoRow icon="📧" label="Email" value={user?.email} />
          <InfoRow icon="📱" label="Phone" value={userProfile?.phoneNumber || 'Not set'} />
          <InfoRow icon="📍" label="Location" value={userProfile?.location || 'Not set'} />
          <InfoRow icon="🎂" label="Age" value={userProfile?.age || 'Not set'} />
          <InfoRow icon="🆔" label="Experience" value={userProfile?.experience || 'Not specified'} />
        </View>

        {/* Account Actions */}
        <Text style={styles.sectionTitle}>Account Settings</Text>
        <View style={styles.actionsCard}>
          <TouchableOpacity 
            style={styles.actionItem}
            onPress={() => navigation.navigate('EditProfile')}
          >
            <Text style={styles.actionIcon}>✏️</Text>
            <Text style={styles.actionText}>Edit Profile</Text>
            <Text style={styles.actionArrow}>›</Text>
          </TouchableOpacity>
          
          <View style={styles.separator} />
          
          <TouchableOpacity style={styles.actionItem}>
            <Text style={styles.actionIcon}>🔐</Text>
            <Text style={styles.actionText}>Change Password</Text>
            <Text style={styles.actionArrow}>›</Text>
          </TouchableOpacity>
          
          <View style={styles.separator} />
          
          <TouchableOpacity style={styles.actionItem}>
            <Text style={styles.actionIcon}>🔔</Text>
            <Text style={styles.actionText}>Notifications</Text>
            <Text style={styles.actionArrow}>›</Text>
          </TouchableOpacity>
          
          <View style={styles.separator} />
          
          <TouchableOpacity style={styles.actionItem}>
            <Text style={styles.actionIcon}>🛡️</Text>
            <Text style={styles.actionText}>Privacy & Security</Text>
            <Text style={styles.actionArrow}>›</Text>
          </TouchableOpacity>
          
          <View style={styles.separator} />
          
          <TouchableOpacity style={styles.actionItem}>
            <Text style={styles.actionIcon}>❓</Text>
            <Text style={styles.actionText}>Help & Support</Text>
            <Text style={styles.actionArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutIcon}>🚪</Text>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Member since {user?.metadata?.creationTime 
              ? new Date(user.metadata.creationTime).toLocaleDateString() 
              : 'Recently'}
          </Text>
          <Text style={styles.footerVersion}>Labor Connect v1.0.0</Text>
        </View>
      </ScrollView>
    </View>
  );
};

// Helper Component
const InfoRow = ({ icon, label, value }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoIcon}>{icon}</Text>
    <View style={styles.infoContent}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    backgroundColor: colors.primary,
  },
  backButton: {
    padding: 5,
  },
  backButtonText: {
    color: colors.white,
    fontSize: 28,
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.white,
  },
  editButton: {
    padding: 5,
  },
  editButtonText: {
    fontSize: 22,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  profileCard: {
    backgroundColor: colors.white,
    padding: 24,
    borderRadius: 20,
    marginBottom: 24,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: colors.primaryLight,
  },
  avatarText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: colors.white,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: colors.success,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.white,
  },
  verifiedIcon: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  profileInfo: {
    alignItems: 'center',
  },
  name: {
    fontSize: 26,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  email: {
    fontSize: 15,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  ratingSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  starsContainer: {
    flexDirection: 'row',
    marginRight: 8,
  },
  star: {
    fontSize: 18,
    marginHorizontal: 1,
  },
  ratingText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginRight: 6,
  },
  ratingCount: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  skillBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.primary + '40',
  },
  skillText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  contactInfo: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  contactIcon: {
    fontSize: 16,
  },
  contactText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    backgroundColor: colors.white,
    padding: 16,
    borderRadius: 16,
    flex: 1,
    minWidth: (width - 52) / 2,
    alignItems: 'center',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  statIcon: {
    fontSize: 24,
  },
  statValue: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  // Earnings Styles
  earningsSummaryCard: {
    backgroundColor: colors.white,
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  earningsStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  earningsStat: {
    alignItems: 'center',
  },
  earningsStatValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 4,
  },
  earningsStatLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  earningsContainer: {
    marginBottom: 24,
  },
  earningCard: {
    backgroundColor: colors.white,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  earningHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  earningInfo: {
    flex: 1,
  },
  earningJob: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  earningEmployer: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  earningDate: {
    fontSize: 12,
    color: colors.textMuted,
  },
  earningAmount: {
    alignItems: 'flex-end',
  },
  earningValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.success,
    marginBottom: 6,
  },
  paymentMethodBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  paymentMethodText: {
    fontSize: 10,
    color: colors.white,
    fontWeight: '600',
  },
  performanceCard: {
    backgroundColor: colors.white,
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  performanceItem: {
    marginBottom: 20,
  },
  performanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  performanceLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  performanceValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.background,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  allSkillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    backgroundColor: colors.white,
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
  },
  reviewsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  reviewsBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  reviewsBadgeText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  reviewsContainer: {
    marginBottom: 24,
  },
  reviewCard: {
    backgroundColor: colors.white,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  reviewerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  reviewerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  reviewerAvatarText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
  },
  reviewerDetails: {
    flex: 1,
  },
  reviewerName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  reviewDate: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  reviewComment: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
    marginBottom: 8,
  },
  reviewJobTitle: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  viewAllButton: {
    backgroundColor: colors.primaryLight,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  viewAllText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    paddingHorizontal: 20,
    marginBottom: 24,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '50',
  },
  infoIcon: {
    fontSize: 20,
    marginRight: 16,
    width: 24,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 4,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  actionsCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    paddingHorizontal: 20,
    marginBottom: 20,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
  },
  actionIcon: {
    fontSize: 20,
    marginRight: 16,
    width: 24,
  },
  actionText: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
    fontWeight: '500',
  },
  actionArrow: {
    fontSize: 20,
    color: colors.textSecondary,
    fontWeight: 'bold',
  },
  separator: {
    height: 1,
    backgroundColor: colors.border + '50',
  },
  logoutButton: {
    flexDirection: 'row',
    backgroundColor: colors.error,
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: colors.error,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  logoutIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  logoutButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  footerText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  footerVersion: {
    fontSize: 12,
    color: colors.textMuted,
  },
});

export default WorkerProfileScreen;