<script setup lang="ts">
import {onBeforeUnmount, onMounted, PropType, ref, watch} from "vue";
import {useRoute} from "vue-router";
import {Message, Modal, Notification} from "@arco-design/web-vue";
import {COMMON_ROLE_CHANGE, ROLE_CHANGE} from "@/types/event-types.ts";
import {
  addChapterInfo,
  batchOperator,
  chapterInfos as queryChapterInfoList,
  commonRoles as queryCommonRoles,
  deleteChapterInfo,
  deleteDramaInfoInference,
  DramaInfo,
  DramaInfoInference,
  ImageContentConfig,
  ImageRole,
  queryDramaInfo,
  roles as queryRoles,
  saveDramaInfoInference,
  startCreateImage,
  updateDramaInfo
} from "@/api/image-chapter.ts";
import {AudioTaskState, EventTypes} from "@/types/global.ts";
import emitter from "@/mitt";

const route = useRoute();
const props = defineProps({
  imageContentConfig: {
    type: Object as PropType<ImageContentConfig>,
    default: {} as ImageContentConfig
  },
  selectedIndexes: {
    type: Array as PropType<string[]>,
    default: []
  },
  creatingIds: {
    type: Array as PropType<string[]>,
    default: []
  }
});

const emits = defineEmits(['update:creatingIds'])

const editMode = ref<'default' | 'batch'>('default')

const audioElement = ref<HTMLAudioElement | null>(null); // ref 对象引用到 audio 元素
const dramaInfos = ref<(DramaInfo &
    {
      showAudioCard: boolean,
      newItem: boolean,
      selected: boolean,
      currentImgIndex: number,
      previewImageFileArr: string[]
    }
    )[]>([]);

const combineExportModalVisible = ref(false);
const conditionSelectVisible = ref(false);
const modelSelectVisible = ref<boolean>(false);
const roleChangeModelVisible = ref<boolean>(false)
const audioParamsChangeModelVisible = ref<boolean>(false)
const roleOptions = ref<ImageRole[]>([])

const currentChapterInfo = ref<DramaInfo>({} as DramaInfo);

const selectedIds = ref<number[]>([]);
const handleQueryChapterInfo = async () => {
  const {data} = await queryChapterInfoList({
    projectId: route.query.projectId as string,
    chapterId: route.query.chapterId as string,
  })
  dramaInfos.value = data.map((item) => {
    return {
      ...item,
      showAudioCard: false,
      newItem: false,
      selected: false,
      currentImgIndex: item.finalImageFiles && item.previewImageFiles ? item.previewImageFiles.split(';').indexOf(item.finalImageFiles) : 999,
      previewImageFileArr: item.previewImageFiles?.split(';')
    }
  });
}

const handleQueryRoles = async () => {
  const res1 = await queryRoles({
    projectId: route.query.projectId as string,
    chapterId: route.query.chapterId as string,
  })
  roleOptions.value = []
  roleOptions.value.push(...res1.data.map(o => {
    o.isCommonRole = false
    return o
  }));

  const res2 = await queryCommonRoles({
    projectId: route.query.projectId as string
  })
  for (let i = 0; i < res2.data.length; i++) {
    let role = res2.data[i];
    if (roleOptions.value.findIndex(o => o.role === role.role) === -1) {
      roleOptions.value.push(Object.assign(role, {isCommonRole: true}));
    }
  }
}

const onRoleChange = () => {
  emitter?.emit(ROLE_CHANGE);
}

const wsDataHandler = (data: any) => {
  if (data?.state === "success" && data?.chapterInfo) {
    dramaInfos.value = dramaInfos.value.map((item) => {
      if (item.index === data?.chapterInfo?.index) {
        return {
          ...item,
          ...data?.chapterInfo,
        }
      }
      return item;
    });
    Notification.success({
      title: `${data?.chapterInfo?.index} 音频生成成功`,
      content: '',
      position: 'topRight',
      duration: 2000
    })
  }
};


const addTextItem = async (index: number, targetIndex: number) => {
  if (targetIndex < 0 || targetIndex >= dramaInfos.value.length) {
    Message.warning('没有可合并目标');
  } else {
    let source = dramaInfos.value[index];
    let target = dramaInfos.value[targetIndex];
    if (index > targetIndex) {
      let change = target.inferences.pop();
      change.dramaInfoId = source.id;
      source.inferences.unshift(change)
      await handleSaveDramaInfoInference(change);
      if (target.inferences.length === 0) {
        await handleDeleteDramaInfo(target)
      }
      emitter?.emit(EventTypes.chapter_info_refresh)
    } else if (index < targetIndex) {
      let change = target.inferences.shift();
      change.dramaInfoId = source.id;
      source.inferences.push(change)
      await handleSaveDramaInfoInference(change);
      if (target.inferences.length === 0) {
        await handleDeleteDramaInfo(target)
      }
      emitter?.emit(EventTypes.chapter_info_refresh)
    }
  }
}

const removeTextItem = async (index: number, targetIndex: number) => {
  let source = dramaInfos.value[index];
  if (source.inferences.length < 2) {
    Message.warning('没有可拆分内容');
  } else {
    if (index > targetIndex) {
      let change = source.inferences.shift();
      let dramaInfo = {
        projectId: source.projectId,
        chapterId: source.chapterId,
        textSort: index,
        role: '未知',
        inferences: [change],
      } as any;
      await deleteDramaInfoInference(change);
      await handleAddDramaInfo(dramaInfo)
      emitter?.emit(EventTypes.chapter_info_refresh)
    } else if (index < targetIndex) {
      let change = source.inferences.pop();
      let dramaInfo = {
        projectId: source.projectId,
        chapterId: source.chapterId,
        textSort: targetIndex,
        role: '未知',
        inferences: [change],
      } as any;
      await deleteDramaInfoInference(change);
      await handleAddDramaInfo(dramaInfo)
      emitter?.emit(EventTypes.chapter_info_refresh)
    }
  }
}

const imageGenerateResult = (data) => {
  let dramaInfo = dramaInfos.value.filter((item) => item.index === data.imgId)?.[0];
  if (dramaInfo) handleQueryDramaInfo(dramaInfo)
}

const handleQueryDramaInfo = async (dramaInfo: DramaInfo) => {
  queryDramaInfo(dramaInfo).then(res => {
        let find = dramaInfos.value.find(item => item.id === res.data.id);
        if (find) {
          find.previewImageFiles = res.data.previewImageFiles;
          find.previewImageFileArr = res.data.previewImageFiles?.split(';')
          find.random = Math.random()
        }
      }
  )
}

const handleRoleCheck = (dramaInfo: DramaInfo, role: ImageRole, bool: boolean) => {
  let roles = dramaInfo.role?.split(',') || []
  if (bool) {
    if (!roles.includes(role.role)) {
      roles.push(role.role)
    }
    dramaInfo.role = roles.join(',')
  } else {
    let index = roles.indexOf(role.role);
    if (index > -1) {
      roles.splice(index, 1)
    }
    dramaInfo.role = roles.join(',')
  }
  updateDramaInfo(dramaInfo)
}

const handleAddDramaInfo = async (dramaInfo: DramaInfo) => {
  const {msg} = await addChapterInfo(dramaInfo)
  Message.success(msg);
  // emitter?.emit(ROLE_CHANGE)
}

const handleSaveDramaInfoInference = async (dramaInfoInference: DramaInfoInference) => {
  await saveDramaInfoInference(dramaInfoInference)
}

const handleUpdateDramaInfo = async (dramaInfo: DramaInfo) => {
  const {msg} = await updateDramaInfo(dramaInfo)
  // emitter?.emit(ROLE_CHANGE)
}

const handleDeleteDramaInfo = async (dramaInfo: DramaInfo) => {
  const {msg} = await deleteChapterInfo({
    id: dramaInfo.id
  } as DramaInfo)
  // emitter?.emit(ROLE_CHANGE)
  Message.success(msg);
}

const handleSelectAllValue = (value: boolean) => {
  dramaInfos.value = dramaInfos.value
      .map((item) => {
        return {
          ...item,
          selected: value
        }
      })
}

const chooseFinalImg = async (dramaInfo: DramaInfo, imgName: string) => {
  dramaInfo.finalImageFiles = imgName;
  await updateDramaInfo(dramaInfo)
  queryDramaInfo(dramaInfo).then(res => {
        let find = dramaInfos.value.find(item => item.id === res.data.id);
        if (find) {
          find.finalImageFiles = res.data.finalImageFiles;
        }
      }
  )
}

const handleBatchOperator = (onSuccess: () => void) => {
  selectedIds.value = dramaInfos.value
      .filter((item) => item.selected)
      .map((item) => item.id);

  if (!selectedIds.value.length) {
    Modal.warning({
      title: '没有选择操作内容',
      content: '请选择操作内容'
    });
  } else {
    onSuccess();
  }
};

const handleBatchRoleChange = () => {
  handleBatchOperator(() => {
    editMode.value = 'batch'
    roleChangeModelVisible.value = true;
  });
}

const handleBatchModelChange = () => {
  handleBatchOperator(() => {
    editMode.value = 'batch'
    modelSelectVisible.value = true;
  });
}

const handleAudioParamsChange = () => {
  handleBatchOperator(() => {
    editMode.value = 'batch'
    audioParamsChangeModelVisible.value = true;
  });
}

const handleCombineExport = () => {
  handleBatchOperator(() => {
    combineExportModalVisible.value = true;
  });
}

const handleMarkupDialogue = (dialogueFlag: boolean) => {
  handleBatchOperator(() => {
    Modal.warning({
      title: dialogueFlag ? `给这(${selectedIds.value.length})个文本添加对话标记？` : `取消这(${selectedIds.value.length})个文本的对话标记？`,
      content: '',
      onOk: async () => {
        const {msg} = await batchOperator({
          projectId: route.query.projectId as string,
          chapterId: route.query.chapterId as string,
          chapterInfoIds: selectedIds.value,
          operatorType: 'dialogue_markup',
          booleanValue: dialogueFlag
        })
        Message.success(msg);
        emitter.emit(EventTypes.chapter_title_refresh)
        emitter.emit(EventTypes.chapter_info_refresh)
        emitter.emit(EventTypes.chapter_role_refresh)
      }
    });
  });
}

const handleBatchDelete = () => {
  handleBatchOperator(() => {
    Modal.error({
      title: `批量删除这(${selectedIds.value.length})个文本？`,
      content: '',
      onOk: async () => {
        const {msg} = await batchOperator({
          projectId: route.query.projectId as string,
          chapterId: route.query.chapterId as string,
          chapterInfoIds: selectedIds.value,
          operatorType: 'delete',
        });
        Message.success(msg);
        emitter.emit(EventTypes.chapter_title_refresh)
        emitter.emit(EventTypes.chapter_info_refresh)
        emitter.emit(EventTypes.chapter_role_refresh)
      }
    });
  });
}

const handleConditionSelect = (value: boolean) => {
  conditionSelectVisible.value = value
}

const handleStartCreateImage = async (actionType: string, chapterInfoIds: number[]) => {
  await startCreateImage({
    projectId: route.query.projectId as string,
    chapterId: route.query.chapterId as string,
    actionType: actionType,
    chapterInfoIds: chapterInfoIds
  });
}

const handleImageGenerate = (actionType: 'all' | 'modified' | 'selected') => {
  selectedIds.value = dramaInfos.value
      .filter((item) => item.selected)
      .map((item) => item.id);

  if (actionType === 'selected' && !selectedIds.value.length) {
    Modal.warning({
      title: '没有选择操作内容',
      content: '请选择操作内容'
    });
  } else {
    Modal.warning({
      title: actionType === 'all'
          ? '全部重新生成？'
          : actionType === 'modified'
              ? '增量修改生成？'
              : `生成选中部分(${selectedIds.value.length})？`,
      content: '',
      onOk() {
        handleStartCreateImage(actionType, selectedIds.value);
      },
    })
  }
}


defineExpose({
  handleSelectAllValue,
  handleConditionSelect,
  handleImageGenerate,

  handleBatchRoleChange,
  handleBatchModelChange,
  handleAudioParamsChange,
  handleCombineExport,
  handleMarkupDialogue,
  handleBatchDelete
})

onMounted(() => {
  emitter?.on(ROLE_CHANGE, handleQueryChapterInfo);
  emitter?.on(ROLE_CHANGE, handleQueryRoles);
  emitter?.on(COMMON_ROLE_CHANGE, handleQueryRoles);
  emitter?.on(EventTypes.chapter_info_refresh, handleQueryChapterInfo);
  emitter?.on(EventTypes.audio_generate_result, wsDataHandler);
  emitter?.on(EventTypes.image_generate_result, imageGenerateResult)
});

onBeforeUnmount(() => {
  emitter?.off(ROLE_CHANGE, handleQueryChapterInfo);
  emitter?.off(ROLE_CHANGE, handleQueryRoles);
  emitter?.off(COMMON_ROLE_CHANGE, handleQueryRoles);
  emitter?.off(EventTypes.chapter_info_refresh, handleQueryChapterInfo);
  emitter?.off(EventTypes.audio_generate_result, wsDataHandler);
});

watch(
    () => route.query.chapterId,
    async () => {
      if (route.query.chapterId) {
        handleQueryRoles()
        await handleQueryChapterInfo()
      }
      selectedIds.value = [];
    },
    {immediate: true}
);

</script>

<template>
  <div class="container">
    <div>
      <div v-for="(item, index) in dramaInfos"
           :key="item.id"
           class="flex bg-gray-500/5 rounded">
        <div style="width: 100%; display: flex; align-items: center;height: 8rem;">
          <div v-if="props.imageContentConfig.edit"
               style="width: 24px; height: 100%;" class="text-card-left-option">
            <div style="height: 100%; display: flex; place-items: center; justify-content: center;align-items: center;">
              <a-checkbox v-model="item.selected"/>
            </div>
          </div>
          <div style=" display: flex; place-items: center;height: 100%;">
            <div style="width: 65px;text-align: center;">
                  <span>
                    {{ item.index }}
                  </span>
              <icon-check-circle-fill
                  v-if="item.imageTaskState >= AudioTaskState.created"
                  style="color: #00B42A; margin-left: 4px"
              />
              <icon-info-circle
                  v-else-if="item.imageTaskState >= AudioTaskState.modified"
                  style="color: #FF7D00; margin-left: 4px"
              />
            </div>
            <div style="width: 200px;height: 100%;overflow: auto;display: flex;flex-direction: column;gap: 5px;">
              <a-tag bordered
                     style="max-width: 180px;white-space: break-spaces;height: auto;display: block;flex: none;"
                     v-for="(text,i) in item.text"
                     :key="i">{{ text }}
              </a-tag>
            </div>
            <a-divider direction="vertical"/>
            <div style="width: 140px;height: 100%;overflow: auto;display: flex;flex-wrap: wrap;gap: 5px;">
              <a-tag bordered checkable
                     style="display: block;flex: none;"
                     :color="role.isCommonRole?'orange':'blue'"
                     :checked="item.role?.split(',').indexOf(role.role)>-1"
                     @check="(b)=>handleRoleCheck(item,role,b)"
                     v-for="(role,i) in roleOptions"
                     :key="i">{{ role.role }}
              </a-tag>
            </div>
            <a-divider direction="vertical"/>
            <div style="width: 300px;height: 100%;">
              <a-textarea v-model="item.imagePrompt"
                          show-word-limit
                          allow-clear
                          style="height: 100%"
                          @change="handleUpdateDramaInfo(item)"/>
            </div>
            <a-divider direction="vertical"/>
            <div style="width: 400px;height: 100%;overflow: auto;">
              <a-image-preview-group v-if="item.previewImageFileArr&&item.previewImageFileArr.length>0"
                                     v-model:current="item.currentImgIndex"
                                     :actions-layout="['']">
                <a-space style="padding: 4px">
                  <a-image v-for="(img,i) in item.previewImageFileArr"
                           @click.right.prevent="chooseFinalImg(item,item.previewImageFileArr[i])"
                           :class="item.finalImageFiles===item.previewImageFileArr[i]?'selected-image':''"
                           :src="'/api/projectDirResource/image/'+route.query.projectName+'/'+route.query.chapterName+'/previewImages/'+img+'?tmp='+item.random"
                           width="160">
                  </a-image>
                </a-space>
                <template #actions>
                  <a-image-preview-action name="选择为最终图" @click="chooseFinalImg(item,item.previewImageFileArr[item.currentImgIndex])">
                    选择为最终图
                  </a-image-preview-action>
                </template>
              </a-image-preview-group>
            </div>
          </div>
          <div v-if="props.imageContentConfig.edit"
               style="width: 28px; margin:0 10px;height: 100%;display: flex;flex-direction: column;flex-wrap: wrap">
            <div style="height: 50%;width: 14px; display: flex; place-items: center; justify-content: center"
                 class="add-other-item"
                 title="向上合并"
                 @click="addTextItem(index, index-1)">
              <icon-plus :size="10"/>
            </div>
            <div style="height: 50%;width: 14px; display: flex; place-items: center; justify-content: center"
                 class="add-other-item"
                 title="向下合并"
                 @click="addTextItem(index, index+1)">
              <icon-plus :size="12"/>
            </div>
            <div style="height: 50%;width: 14px; display: flex; place-items: center; justify-content: center"
                 class="add-other-item"
                 title="向上拆分"
                 @click="removeTextItem(index, index-1)">
              <icon-minus :size="10"/>
            </div>
            <div style="height: 50%;width: 14px; display: flex; place-items: center; justify-content: center"
                 class="add-other-item"
                 title="向下拆分"
                 @click="removeTextItem(index, index+1)">
              <icon-minus :size="12"/>
            </div>
          </div>
        </div>
        <a-divider/>
      </div>
    </div>
  </div>
</template>

<style scoped>
.lines-color {
  background-color: #3367D1;
  color: #ffffff;
}

.add-other-item {
  background-color: #eeeeee;
}

.add-other-item:hover {
  background-color: #cccccc;
}

.text-card-left-option :deep(.arco-checkbox) {
  padding-left: 0;
}

.selected-image {
  outline: #32ff0e 5px solid;
}
</style>
