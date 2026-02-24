package com.barberia.stylebook.repository;

import com.barberia.stylebook.domain.entity.AdminUser;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface AdminUserRepository extends JpaRepository<AdminUser, UUID> {
    Optional<AdminUser> findByEmailIgnoreCase(String email);
    Optional<AdminUser> findByFirebaseUid(String firebaseUid);
}
