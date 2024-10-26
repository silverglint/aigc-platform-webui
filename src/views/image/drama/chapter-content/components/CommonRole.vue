<script setup lang="ts">
import {useRoute} from "vue-router";
import {onBeforeUnmount, onMounted, ref, watch} from "vue";
import {Message, Modal} from "@arco-design/web-vue";
import {commonRoles as queryCommonRoles, deleteCommonRole, ImageRole,} from "@/api/image-chapter.ts";
import {COMMON_ROLE_CHANGE} from "@/types/event-types.ts";
import RoleEdit from "@/views/image/drama/chapter-content/components/RoleEdit.vue";
import emitter from "@/mitt";

const route = useRoute();

const modelSelectVisible = ref<boolean>(false);

const commonRoles = ref<ImageRole[]>([])

const handleQueryCommonRoles = async () => {
  const {data} = await queryCommonRoles({
    projectId: route.query.projectId as string
  })
  commonRoles.value = data;
}

const ruleActiveKey = ref<(string | number)[]>([])
const openAllRule = () => {
  ruleActiveKey.value.length !== 0
      ? ruleActiveKey.value = []
      : ruleActiveKey.value = [...Array(commonRoles.value.length).keys()]
}

const currentRole = ref<ImageRole>({} as ImageRole);
const actionType = ref<'add' | 'edit'>('add')
const selectModelType = ref<'roleModelChange' | 'addCommonRole' | ''>('')

const addCommonRole = () => {
  actionType.value = 'add';
  selectModelType.value = 'addCommonRole'
  currentRole.value = {} as ImageRole;
  modelSelectVisible.value = true
}

const refresh = () => {
  handleQueryCommonRoles();
}

const onRoleRename = (role: ImageRole) => {
  actionType.value = 'edit';
  currentRole.value = role;
  modelSelectVisible.value = true;
}

const onDeleteRole = (role: ImageRole) => {
  Modal.error({
    title: `确认删除公共角色[${role.role}]?`,
    content: '',
    async onOk() {
      const {msg} = await deleteCommonRole({
        ...role,
        projectId: route.query.projectId as string,
      });
      Message.success(msg);
      refresh();
    },
  })
}

onMounted(() => {
  emitter?.on(COMMON_ROLE_CHANGE, handleQueryCommonRoles);
});

onBeforeUnmount(() => {
  emitter?.off(COMMON_ROLE_CHANGE, handleQueryCommonRoles);
});

watch(
    () => route.query.chapterId,
    () => {
      if (route.query.chapterId) {
        handleQueryCommonRoles();
      }
    },
    {immediate: true}
);

</script>

<template>
  <div>
    <div>
      <a-button
          v-if="commonRoles && commonRoles.length"
          type="outline"
          size="small"
          style="margin-bottom: 12px"
          @click="openAllRule"
      >
        {{ ruleActiveKey.length !== 0 ? '收起所有' : '展开所有' }}
      </a-button>
      <a-collapse
          :active-key="ruleActiveKey"
          @change="(value: any) => (ruleActiveKey = value)"
      >
        <a-collapse-item v-for="(item, index) in commonRoles" :key="index">
          <template #header>
            <span>{{ item.role }}</span>
          </template>
          <div>
            <div>
              <a-descriptions :column="1"
                              size="medium">
                <a-descriptions-item label="提示词">
                  {{ item.imagePrompt }}
                </a-descriptions-item>
              </a-descriptions>
            </div>
            <div style="text-align: left">
              <a-space wrap>
                <a-dropdown-button
                    type="outline"
                    size="small"
                >
                  角色
                  <template #icon>
                    <icon-down/>
                  </template>
                  <template #content>
                    <a-doption @click="onRoleRename(item)">角色修改</a-doption>
                    <a-doption @click="onDeleteRole(item)">删除角色</a-doption>
                  </template>
                </a-dropdown-button>
              </a-space>
            </div>
          </div>
        </a-collapse-item>
      </a-collapse>
    </div>
    <div style="margin-top: 10px">
      <a-button type="outline"
                size="small"
                @click="addCommonRole">
        添加预置角色
      </a-button>
    </div>

    <role-edit v-model:visible="modelSelectVisible"
               :action-type="actionType"
               :role="currentRole"
               :role-type="'commonRole'"
               @success="refresh"
    />
  </div>
</template>

<style scoped>
:deep(.arco-typography, p.arco-typography) {
  margin: 0;
}
</style>
