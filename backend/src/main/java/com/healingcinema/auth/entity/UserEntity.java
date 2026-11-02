package com.healingcinema.auth.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Tài khoản người dùng và quyền lợi được lưu bền vững trong cơ sở dữ liệu. */
@Entity
@Table(name = "cinema_users")
@Getter
@Setter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class UserEntity {

    @Id
    @Column(nullable = false, length = 36, updatable = false)
    private String id;

    @Column(nullable = false, unique = true, length = 24)
    private String username;

    @Column(nullable = false, length = 64)
    private String passwordSalt;

    @Column(nullable = false, length = 64)
    private String passwordHash;

    @Column(nullable = false, length = 40)
    private String displayName;

    @Column(nullable = false, length = 32)
    private String avatar;

    @Column(nullable = false)
    private int shirtColorIndex;

    @Column(nullable = false)
    private int accessoryIndex;

    @Column(nullable = false)
    private int hairColorIndex;

    @Column(nullable = false)
    private int vipTier;

    @Column(nullable = false)
    private long createdAt;
}
